import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyApiKey } from "@/lib/webhook";
import { createActivityLog } from "@/lib/activity-log";
import { analyzeLead } from "@/lib/ai/actions";
import { isAIConfigured } from "@/lib/ai/types";

interface WebhookRequestBody {
  companyName: string;
  name?: string;
  country?: string;
  email?: string;
  whatsapp?: string;
  phone?: string;
  sourceWebsite?: string;
  productInterest?: string;
  inquiryContent?: string;
  notes?: string;
  businessLineCode?: string;
  source?: string;
  leadGrade?: string;
  priority?: string;
}

async function logWebhook(
  externalSourceId: number | null,
  sourceCode: string | null,
  status: "SUCCESS" | "FAILED" | "UNAUTHORIZED" | "DUPLICATE" | "VALIDATION_ERROR",
  requestBody: string | null,
  responseBody: string | null,
  errorMessage: string | null,
  createdLeadId: number | null,
  ipAddress: string | null,
  userAgent: string | null
) {
  try {
    await prisma.webhookLog.create({
      data: {
        externalSourceId,
        sourceCode,
        status,
        requestBody: requestBody?.slice(0, 10000),
        responseBody: responseBody?.slice(0, 5000),
        errorMessage,
        createdLeadId,
        ipAddress,
        userAgent,
      },
    });
  } catch (error) {
    console.error("Failed to log webhook:", error);
  }
}

function getClientIp(request: NextRequest): string | null {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  return request.headers.get("x-real-ip") || null;
}

export async function POST(request: NextRequest) {
  const ipAddress = getClientIp(request);
  const userAgent = request.headers.get("user-agent");
  const sourceCode = request.headers.get("x-crm-source-code");
  const apiKey = request.headers.get("x-crm-api-key");

  // 检查 source code
  if (!sourceCode) {
    const response = { error: "Missing x-crm-source-code header" };
    await logWebhook(null, null, "VALIDATION_ERROR", null, JSON.stringify(response), response.error, null, ipAddress, userAgent);
    return NextResponse.json(response, { status: 400 });
  }

  // 检查 API Key
  if (!apiKey) {
    const response = { error: "Missing x-crm-api-key header" };
    await logWebhook(null, sourceCode, "UNAUTHORIZED", null, JSON.stringify(response), response.error, null, ipAddress, userAgent);
    return NextResponse.json(response, { status: 401 });
  }

  // 查找 ExternalSource
  const externalSource = await prisma.externalSource.findUnique({
    where: { code: sourceCode },
    include: { businessLine: true },
  });

  if (!externalSource) {
    const response = { error: "Invalid source code" };
    await logWebhook(null, sourceCode, "UNAUTHORIZED", null, JSON.stringify(response), response.error, null, ipAddress, userAgent);
    return NextResponse.json(response, { status: 401 });
  }

  // 检查是否启用
  if (!externalSource.isActive) {
    const response = { error: "External source is inactive" };
    await logWebhook(externalSource.id, sourceCode, "UNAUTHORIZED", null, JSON.stringify(response), response.error, null, ipAddress, userAgent);
    return NextResponse.json(response, { status: 403 });
  }

  // 验证 API Key
  if (!externalSource.apiKeyHash) {
    const response = { error: "API key not configured for this source" };
    await logWebhook(externalSource.id, sourceCode, "UNAUTHORIZED", null, JSON.stringify(response), response.error, null, ipAddress, userAgent);
    return NextResponse.json(response, { status: 401 });
  }

  if (!verifyApiKey(apiKey, externalSource.apiKeyHash)) {
    const response = { error: "Invalid API key" };
    await logWebhook(externalSource.id, sourceCode, "UNAUTHORIZED", null, JSON.stringify(response), response.error, null, ipAddress, userAgent);
    return NextResponse.json(response, { status: 401 });
  }

  // 解析请求体
  let body: WebhookRequestBody;
  try {
    body = await request.json();
  } catch {
    const response = { error: "Invalid JSON body" };
    await logWebhook(externalSource.id, sourceCode, "VALIDATION_ERROR", null, JSON.stringify(response), response.error, null, ipAddress, userAgent);
    return NextResponse.json(response, { status: 400 });
  }

  const requestBody = JSON.stringify(body);

  // 验证必填字段
  if (!body.companyName) {
    const response = { error: "companyName is required" };
    await logWebhook(externalSource.id, sourceCode, "VALIDATION_ERROR", requestBody, JSON.stringify(response), response.error, null, ipAddress, userAgent);
    return NextResponse.json(response, { status: 400 });
  }

  // 确定业务线
  let businessLineId: number | null = null;
  if (body.businessLineCode) {
    const bl = await prisma.businessLine.findUnique({
      where: { code: body.businessLineCode },
    });
    if (bl) {
      businessLineId = bl.id;
    }
  }
  if (!businessLineId && externalSource.businessLineId) {
    businessLineId = externalSource.businessLineId;
  }
  if (!businessLineId) {
    const response = { error: "Business line is required or invalid" };
    await logWebhook(externalSource.id, sourceCode, "VALIDATION_ERROR", requestBody, JSON.stringify(response), response.error, null, ipAddress, userAgent);
    return NextResponse.json(response, { status: 400 });
  }

  // 重复检测
  if (body.email) {
    const existingLead = await prisma.lead.findFirst({
      where: { email: body.email },
    });
    if (existingLead) {
      const response = { success: true, status: "duplicate", leadId: existingLead.id, message: "Lead already exists with this email" };
      await logWebhook(externalSource.id, sourceCode, "DUPLICATE", requestBody, JSON.stringify(response), null, existingLead.id, ipAddress, userAgent);
      return NextResponse.json(response, { status: 200 });
    }
  }

  // 创建 Lead
  try {
    const lead = await prisma.lead.create({
      data: {
        tenantId: 1,
        company: body.companyName,
        contactName: body.name || body.companyName,
        country: body.country || null,
        email: body.email || null,
        whatsapp: body.whatsapp || null,
        phone: body.phone || null,
        sourceWebsite: body.sourceWebsite || null,
        interestProducts: body.productInterest || null,
        inquiryContent: body.inquiryContent || null,
        remark: body.notes || null,
        source: (body.source as any) || externalSource.defaultSource,
        grade: (body.leadGrade as any) || externalSource.defaultLeadGrade,
        status: "NEW",
        temperature: "WARM",
        businessLineId,
      },
    });

    // 记录 ActivityLog
    await createActivityLog({
      action: "Webhook 创建",
      entityType: "线索",
      entityId: lead.id,
      entityName: lead.company,
      description: `Webhook 创建线索: ${lead.company} (来源: ${externalSource.name})`,
    });

    // 自动 AI 分析
    let aiAnalysisCreated = false;
    let aiAnalysisId: number | null = null;
    let aiAnalysisError: string | null = null;

    if (isAIConfigured()) {
      try {
        const aiResult = await analyzeLead(lead.id);
        if (aiResult.success) {
          aiAnalysisCreated = true;
          aiAnalysisId = aiResult.analysisId || null;
          await createActivityLog({
            action: "Webhook 自动AI分析",
            entityType: "线索",
            entityId: lead.id,
            entityName: lead.company,
            description: `Webhook 创建线索后自动 AI 分析: ${lead.company}`,
          });
        } else {
          aiAnalysisError = aiResult.error || "AI analysis failed";
        }
      } catch (error) {
        aiAnalysisError = error instanceof Error ? error.message : "AI analysis error";
      }
    }

    const response: Record<string, unknown> = {
      success: true,
      leadId: lead.id,
      message: "Lead created successfully",
    };

    if (isAIConfigured()) {
      response.aiAnalysisCreated = aiAnalysisCreated;
      if (aiAnalysisId) response.aiAnalysisId = aiAnalysisId;
      if (aiAnalysisError) response.aiAnalysisError = aiAnalysisError;
    }

    await logWebhook(externalSource.id, sourceCode, "SUCCESS", requestBody, JSON.stringify(response), null, lead.id, ipAddress, userAgent);

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Failed to create lead";
    const response = { error: errorMsg };
    await logWebhook(externalSource.id, sourceCode, "FAILED", requestBody, JSON.stringify(response), errorMsg, null, ipAddress, userAgent);
    return NextResponse.json(response, { status: 500 });
  }
}
