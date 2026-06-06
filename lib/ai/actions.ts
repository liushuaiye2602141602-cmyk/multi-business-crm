"use server";

import prisma from "@/lib/prisma";
import { isAIConfigured } from "./types";
import { chatCompletion, AIError } from "./client";
import { parseAIResponse, buildAnalysisTitle } from "./parser";
import {
  buildLeadAnalysisPrompt,
  buildCustomerReviewPrompt,
  buildProjectAnalysisPrompt,
  buildFollowUpReplyPrompt,
  buildTemplateRewritePrompt,
  buildTestPrompt,
} from "./prompts";
import { createActivityLog } from "@/lib/activity-log";
import { revalidatePath } from "next/cache";

function getErrorMessage(error: unknown): string {
  if (error instanceof AIError) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "AI 分析失败，请稍后重试";
}

export async function analyzeLead(leadId: number) {
  if (!isAIConfigured()) {
    return { success: false, error: "AI_API_KEY 未配置，请检查 .env 文件" };
  }

  try {
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      include: {
        businessLine: true,
        followUps: { orderBy: { followUpDate: "desc" }, take: 10 },
      },
    });

    if (!lead) return { success: false, error: "线索不存在" };

    const messages = buildLeadAnalysisPrompt({
      company: lead.company,
      contactName: lead.contactName,
      country: lead.country,
      email: lead.email,
      whatsapp: lead.whatsapp,
      source: lead.source,
      sourceWebsite: lead.sourceWebsite,
      interestProducts: lead.interestProducts,
      inquiryContent: lead.inquiryContent,
      requirement: lead.requirement,
      remark: lead.remark,
      businessLineName: lead.businessLine.name,
      businessLineCode: lead.businessLine.code || undefined,
      followUps: lead.followUps.map((fu) => ({
        content: fu.content,
        customerFeedback: fu.customerFeedback,
        nextAction: fu.nextAction,
      })),
    });

    const rawInput = JSON.stringify(messages, null, 2);
    const rawOutput = await chatCompletion(messages);
    const result = parseAIResponse(rawOutput);

    const analysis = await prisma.aIAnalysis.create({
      data: {
        targetType: "LEAD",
        targetId: leadId,
        title: buildAnalysisTitle("LEAD", lead.company),
        summary: result.summary,
        requirementSummary: result.requirementSummary,
        extractedRequirements: result.extractedRequirements,
        qualificationLevel: result.qualificationLevel,
        intentLevel: result.intentLevel,
        buyerTypeGuess: result.buyerTypeGuess,
        riskPoints: result.riskPoints,
        missingInfo: result.missingInfo,
        suggestedQuestions: result.suggestedQuestions,
        nextAction: result.nextAction,
        whatsappReply: result.whatsappReply,
        emailSubject: result.emailSubject,
        emailReply: result.emailReply,
        internalSalesNote: result.internalSalesNote,
        rawInput,
        rawOutput,
      },
    });

    await createActivityLog({
      action: "AI 分析",
      entityType: "线索",
      entityId: leadId,
      entityName: lead.company,
      description: `AI 分析线索: ${lead.company}`,
    });

    revalidatePath(`/leads/${leadId}`);

    return { success: true, analysis: result, analysisId: analysis.id };
  } catch (error) {
    return { success: false, error: getErrorMessage(error) };
  }
}

export async function reviewCustomer(customerId: number) {
  if (!isAIConfigured()) {
    return { success: false, error: "AI_API_KEY 未配置，请检查 .env 文件" };
  }

  try {
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      include: {
        businessLine: true,
        projects: { orderBy: { createdAt: "desc" }, take: 10 },
        followUps: { orderBy: { followUpDate: "desc" }, take: 10 },
        quotes: { orderBy: { createdAt: "desc" }, take: 10 },
        tasks: { where: { status: { in: ["PENDING", "IN_PROGRESS"] } }, orderBy: { dueDate: "asc" }, take: 10 },
      },
    });

    if (!customer) return { success: false, error: "客户不存在" };

    const messages = buildCustomerReviewPrompt({
      company: customer.company,
      contactName: customer.contactName,
      country: customer.country,
      email: customer.email,
      whatsapp: customer.whatsapp,
      customerType: customer.customerType,
      customerStatus: customer.customerStatus,
      leadGrade: customer.leadGrade,
      businessLineName: customer.businessLine.name,
      businessLineCode: customer.businessLine.code || undefined,
      remark: customer.remark,
      projects: customer.projects.map((p) => ({
        name: p.name,
        status: p.status,
        productName: p.productName,
        amount: p.amount ? Number(p.amount) : null,
      })),
      followUps: customer.followUps.map((fu) => ({
        content: fu.content,
        customerFeedback: fu.customerFeedback,
        followUpDate: fu.followUpDate,
      })),
      quotes: customer.quotes.map((q) => ({
        quoteNo: q.quoteNo,
        status: q.status,
        totalPrice: q.totalPrice ? Number(q.totalPrice) : null,
      })),
      tasks: customer.tasks.map((t) => ({
        title: t.title,
        status: t.status,
        dueDate: t.dueDate,
      })),
    });

    const rawInput = JSON.stringify(messages, null, 2);
    const rawOutput = await chatCompletion(messages);
    const result = parseAIResponse(rawOutput);

    const analysis = await prisma.aIAnalysis.create({
      data: {
        targetType: "CUSTOMER",
        targetId: customerId,
        title: buildAnalysisTitle("CUSTOMER", customer.company),
        summary: result.summary,
        requirementSummary: result.requirementSummary,
        extractedRequirements: result.extractedRequirements,
        qualificationLevel: result.qualificationLevel,
        intentLevel: result.intentLevel,
        buyerTypeGuess: result.buyerTypeGuess,
        riskPoints: result.riskPoints,
        missingInfo: result.missingInfo,
        suggestedQuestions: result.suggestedQuestions,
        nextAction: result.nextAction,
        whatsappReply: result.whatsappReply,
        emailSubject: result.emailSubject,
        emailReply: result.emailReply,
        internalSalesNote: result.internalSalesNote,
        rawInput,
        rawOutput,
      },
    });

    await createActivityLog({
      action: "AI 复盘",
      entityType: "客户",
      entityId: customerId,
      entityName: customer.company,
      description: `AI 复盘客户: ${customer.company}`,
    });

    revalidatePath(`/customers/${customerId}`);

    return { success: true, analysis: result, analysisId: analysis.id };
  } catch (error) {
    return { success: false, error: getErrorMessage(error) };
  }
}

export async function analyzeProject(projectId: number) {
  if (!isAIConfigured()) {
    return { success: false, error: "AI_API_KEY 未配置，请检查 .env 文件" };
  }

  try {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        businessLine: true,
        customer: true,
        lead: true,
        followUps: { orderBy: { followUpDate: "desc" }, take: 10 },
        quotes: { orderBy: { createdAt: "desc" }, take: 10 },
      },
    });

    if (!project) return { success: false, error: "项目不存在" };

    const messages = buildProjectAnalysisPrompt({
      name: project.name,
      status: project.status,
      productCategory: project.productCategory,
      productName: project.productName,
      specs: project.specs,
      quantity: project.quantity,
      usage: project.usage,
      targetMarket: project.targetMarket,
      specialRequirements: project.specialRequirements,
      amount: project.amount ? Number(project.amount) : null,
      currency: project.currency,
      description: project.description,
      remark: project.remark,
      businessLineName: project.businessLine.name,
      businessLineCode: project.businessLine.code || undefined,
      customerName: project.customer.company,
      leadName: project.lead?.company,
      followUps: project.followUps.map((fu) => ({
        content: fu.content,
        customerFeedback: fu.customerFeedback,
      })),
      quotes: project.quotes.map((q) => ({
        quoteNo: q.quoteNo,
        status: q.status,
        totalPrice: q.totalPrice ? Number(q.totalPrice) : null,
      })),
    });

    const rawInput = JSON.stringify(messages, null, 2);
    const rawOutput = await chatCompletion(messages);
    const result = parseAIResponse(rawOutput);

    const analysis = await prisma.aIAnalysis.create({
      data: {
        targetType: "PROJECT",
        targetId: projectId,
        title: buildAnalysisTitle("PROJECT", project.name),
        summary: result.summary,
        requirementSummary: result.requirementSummary,
        extractedRequirements: result.extractedRequirements,
        qualificationLevel: result.qualificationLevel,
        intentLevel: result.intentLevel,
        buyerTypeGuess: result.buyerTypeGuess,
        riskPoints: result.riskPoints,
        missingInfo: result.missingInfo,
        suggestedQuestions: result.suggestedQuestions,
        nextAction: result.nextAction,
        whatsappReply: result.whatsappReply,
        emailSubject: result.emailSubject,
        emailReply: result.emailReply,
        internalSalesNote: result.internalSalesNote,
        rawInput,
        rawOutput,
      },
    });

    await createActivityLog({
      action: "AI 分析",
      entityType: "项目",
      entityId: projectId,
      entityName: project.name,
      description: `AI 分析项目: ${project.name}`,
    });

    revalidatePath(`/projects/${projectId}`);

    return { success: true, analysis: result, analysisId: analysis.id };
  } catch (error) {
    return { success: false, error: getErrorMessage(error) };
  }
}

export async function generateFollowUpReply(followUpId: number) {
  if (!isAIConfigured()) {
    return { success: false, error: "AI_API_KEY 未配置，请检查 .env 文件" };
  }

  try {
    const followUp = await prisma.followUp.findUnique({
      where: { id: followUpId },
      include: {
        lead: true,
        customer: true,
        project: { include: { customer: true, businessLine: true } },
      },
    });

    if (!followUp) return { success: false, error: "跟进记录不存在" };

    let relatedInfo;
    if (followUp.lead) {
      const previousFollowUps = await prisma.followUp.findMany({
        where: { leadId: followUp.leadId },
        orderBy: { followUpDate: "desc" },
        take: 5,
      });
      relatedInfo = {
        type: "lead" as const,
        name: followUp.lead.company,
        country: followUp.lead.country || undefined,
        previousFollowUps: previousFollowUps.map((fu) => fu.content),
      };
    } else if (followUp.customer) {
      const previousFollowUps = await prisma.followUp.findMany({
        where: { customerId: followUp.customerId },
        orderBy: { followUpDate: "desc" },
        take: 5,
      });
      relatedInfo = {
        type: "customer" as const,
        name: followUp.customer.company,
        country: followUp.customer.country || undefined,
        previousFollowUps: previousFollowUps.map((fu) => fu.content),
      };
    } else if (followUp.project) {
      relatedInfo = {
        type: "project" as const,
        name: followUp.project.name,
        businessLine: followUp.project.businessLine.name,
        businessLineCode: followUp.project.businessLine.code || undefined,
        country: followUp.project.customer?.country || undefined,
      };
    }

    const messages = buildFollowUpReplyPrompt({
      content: followUp.content,
      customerFeedback: followUp.customerFeedback,
      nextAction: followUp.nextAction,
      method: followUp.method,
      relatedInfo,
    });

    const rawInput = JSON.stringify(messages, null, 2);
    const rawOutput = await chatCompletion(messages);
    const result = parseAIResponse(rawOutput);

    const entityName = followUp.lead?.company || followUp.customer?.company || followUp.project?.name || "跟进";

    const analysis = await prisma.aIAnalysis.create({
      data: {
        targetType: "FOLLOW_UP",
        targetId: followUpId,
        title: buildAnalysisTitle("FOLLOW_UP", entityName),
        summary: result.summary,
        requirementSummary: result.requirementSummary,
        qualificationLevel: result.qualificationLevel,
        intentLevel: result.intentLevel,
        riskPoints: result.riskPoints,
        missingInfo: result.missingInfo,
        suggestedQuestions: result.suggestedQuestions,
        nextAction: result.nextAction,
        whatsappReply: result.whatsappReply,
        emailSubject: result.emailSubject,
        emailReply: result.emailReply,
        internalSalesNote: result.internalSalesNote,
        rawInput,
        rawOutput,
      },
    });

    await createActivityLog({
      action: "AI 生成回复",
      entityType: "跟进",
      entityId: followUpId,
      entityName,
      description: `AI 生成跟进回复: ${entityName}`,
    });

    revalidatePath(`/follow-ups/${followUpId}`);

    return { success: true, analysis: result, analysisId: analysis.id };
  } catch (error) {
    return { success: false, error: getErrorMessage(error) };
  }
}

export async function rewriteTemplate(
  templateId: number,
  rewriteType: "whatsapp" | "email" | "high_intent"
) {
  if (!isAIConfigured()) {
    return { success: false, error: "AI_API_KEY 未配置，请检查 .env 文件" };
  }

  try {
    const template = await prisma.followUpTemplate.findUnique({
      where: { id: templateId },
    });

    if (!template) return { success: false, error: "模板不存在" };

    const messages = buildTemplateRewritePrompt({
      title: template.title,
      scene: template.scene,
      content: template.content,
      language: template.language,
      rewriteType,
    });

    const rawInput = JSON.stringify(messages, null, 2);
    const rawOutput = await chatCompletion(messages);
    const result = parseAIResponse(rawOutput);

    const analysis = await prisma.aIAnalysis.create({
      data: {
        targetType: "TEMPLATE",
        targetId: templateId,
        title: buildAnalysisTitle("TEMPLATE", template.title),
        summary: result.summary,
        whatsappReply: result.whatsappReply,
        emailSubject: result.emailSubject,
        emailReply: result.emailReply,
        internalSalesNote: result.internalSalesNote,
        rawInput,
        rawOutput,
      },
    });

    await createActivityLog({
      action: "AI 改写",
      entityType: "模板",
      entityId: templateId,
      entityName: template.title,
      description: `AI 改写模板: ${template.title}`,
    });

    revalidatePath(`/templates/${templateId}`);

    return { success: true, analysis: result, analysisId: analysis.id };
  } catch (error) {
    return { success: false, error: getErrorMessage(error) };
  }
}

export async function testAIAnalysis(inquiry: string, businessLineCode: string) {
  if (!isAIConfigured()) {
    return { success: false, error: "AI_API_KEY 未配置，请检查 .env 文件" };
  }

  try {
    const messages = buildTestPrompt(inquiry, businessLineCode);
    const rawOutput = await chatCompletion(messages);
    const result = parseAIResponse(rawOutput);

    return { success: true, analysis: result, rawOutput };
  } catch (error) {
    return { success: false, error: getErrorMessage(error) };
  }
}

export async function applyLeadQualification(leadId: number, qualificationLevel: string) {
  try {
    const gradeMap: Record<string, string> = {
      A: "A", B: "B", C: "C", D: "D",
    };

    const grade = gradeMap[qualificationLevel.toUpperCase()];
    if (!grade) return { success: false, error: "无效的客户等级" };

    const lead = await prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) return { success: false, error: "线索不存在" };

    await prisma.lead.update({
      where: { id: leadId },
      data: { grade: grade as any },
    });

    await createActivityLog({
      action: "应用AI建议",
      entityType: "线索",
      entityId: leadId,
      entityName: lead.company,
      description: `应用 AI 客户等级建议: ${grade}`,
    });

    revalidatePath(`/leads/${leadId}`);

    return { success: true };
  } catch (error) {
    return { success: false, error: "应用失败" };
  }
}

export async function appendToProjectNotes(projectId: number, content: string) {
  try {
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) return { success: false, error: "项目不存在" };

    const existingNotes = project.remark || "";
    const newNotes = existingNotes
      ? `${existingNotes}\n\n--- AI 分析 (${new Date().toLocaleDateString("zh-CN")}) ---\n${content}`
      : `--- AI 分析 (${new Date().toLocaleDateString("zh-CN")}) ---\n${content}`;

    await prisma.project.update({
      where: { id: projectId },
      data: { remark: newNotes },
    });

    await createActivityLog({
      action: "应用AI建议",
      entityType: "项目",
      entityId: projectId,
      entityName: project.name,
      description: "追加 AI 分析到项目备注",
    });

    revalidatePath(`/projects/${projectId}`);

    return { success: true };
  } catch (error) {
    return { success: false, error: "追加失败" };
  }
}

export async function appendToCustomerNotes(customerId: number, content: string) {
  try {
    const customer = await prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer) return { success: false, error: "客户不存在" };

    const existingNotes = customer.remark || "";
    const newNotes = existingNotes
      ? `${existingNotes}\n\n--- AI 复盘 (${new Date().toLocaleDateString("zh-CN")}) ---\n${content}`
      : `--- AI 复盘 (${new Date().toLocaleDateString("zh-CN")}) ---\n${content}`;

    await prisma.customer.update({
      where: { id: customerId },
      data: { remark: newNotes },
    });

    await createActivityLog({
      action: "应用AI建议",
      entityType: "客户",
      entityId: customerId,
      entityName: customer.company,
      description: "追加 AI 复盘到客户备注",
    });

    revalidatePath(`/customers/${customerId}`);

    return { success: true };
  } catch (error) {
    return { success: false, error: "追加失败" };
  }
}

export async function createTaskFromAI(
  targetType: "lead" | "customer" | "project",
  targetId: number,
  nextAction: string
) {
  try {
    let title = nextAction;
    let leadId: number | null = null;
    let customerId: number | null = null;
    let projectId: number | null = null;

    if (targetType === "lead") {
      const lead = await prisma.lead.findUnique({ where: { id: targetId } });
      if (!lead) return { success: false, error: "线索不存在" };
      title = `跟进: ${lead.company} - ${nextAction.slice(0, 50)}`;
      leadId = targetId;
    } else if (targetType === "customer") {
      const customer = await prisma.customer.findUnique({ where: { id: targetId } });
      if (!customer) return { success: false, error: "客户不存在" };
      title = `跟进: ${customer.company} - ${nextAction.slice(0, 50)}`;
      customerId = targetId;
    } else if (targetType === "project") {
      const project = await prisma.project.findUnique({ where: { id: targetId } });
      if (!project) return { success: false, error: "项目不存在" };
      title = `跟进: ${project.name} - ${nextAction.slice(0, 50)}`;
      projectId = targetId;
    }

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0);

    await prisma.task.create({
      data: {
        title,
        type: "FOLLOW_UP",
        status: "PENDING",
        priority: "MEDIUM",
        dueDate: tomorrow,
        leadId,
        customerId,
        projectId,
      },
    });

    await createActivityLog({
      action: "创建任务",
      entityType: "AI分析",
      entityId: targetId,
      entityName: title,
      description: `从 AI 分析创建跟进任务: ${title}`,
    });

    revalidatePath("/tasks");

    return { success: true };
  } catch (error) {
    return { success: false, error: "创建任务失败" };
  }
}
