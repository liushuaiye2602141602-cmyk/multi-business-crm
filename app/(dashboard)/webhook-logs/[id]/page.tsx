import Link from "next/link";
export const dynamic = "force-dynamic";
import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import { formatDateTime } from "@/lib/format";
import { WebhookStatusLabel } from "@/lib/enums";
import PageHeader from "@/components/PageHeader";
import Badge from "@/components/Badge";

export default async function WebhookLogDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const log = await prisma.webhookLog.findUnique({
    where: { id: parseInt(id) },
  });

  if (!log) return notFound();

  let requestBody: Record<string, unknown> | null = null;
  let responseBody: Record<string, unknown> | null = null;

  try {
    if (log.requestBody) requestBody = JSON.parse(log.requestBody);
  } catch {}
  try {
    if (log.responseBody) responseBody = JSON.parse(log.responseBody);
  } catch {}

  // 从 requestBody 中提取摘要
  const summary = {
    companyName: requestBody?.companyName as string | undefined,
    email: requestBody?.email as string | undefined,
    productInterest: requestBody?.productInterest as string | undefined,
  };

  const statusColors: Record<string, string> = {
    SUCCESS: "bg-green-100 text-green-700",
    FAILED: "bg-red-100 text-red-700",
    UNAUTHORIZED: "bg-red-100 text-red-700",
    DUPLICATE: "bg-yellow-100 text-yellow-700",
    VALIDATION_ERROR: "bg-orange-100 text-orange-700",
  };

  return (
    <div>
      <PageHeader title="Webhook 日志详情" backHref="/webhook-logs" />

      {/* 摘要信息 */}
      {summary.companyName && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex flex-wrap gap-4 text-sm">
            {summary.companyName && (
              <span><strong>公司名：</strong>{summary.companyName}</span>
            )}
            {summary.email && (
              <span><strong>邮箱：</strong>{summary.email}</span>
            )}
            {summary.productInterest && (
              <span><strong>产品兴趣：</strong>{summary.productInterest}</span>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 基本信息 */}
        <div className="bg-white rounded-lg border p-6">
          <h2 className="text-lg font-semibold mb-4">基本信息</h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">时间：</span>
              <span>{formatDateTime(log.createdAt)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">来源代码：</span>
              <span className="font-mono text-xs">{log.sourceCode || "-"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">状态：</span>
              <Badge
                label={WebhookStatusLabel[log.status] || log.status}
                className={statusColors[log.status] || "bg-gray-100 text-gray-700"}
              />
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">创建线索：</span>
              {log.createdLeadId ? (
                <Link href={`/leads/${log.createdLeadId}`} className="text-blue-600 hover:underline">
                  #{log.createdLeadId}
                </Link>
              ) : (
                <span>-</span>
              )}
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">IP 地址：</span>
              <span>{log.ipAddress || "-"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">User Agent：</span>
              <span className="max-w-xs truncate text-xs">{log.userAgent || "-"}</span>
            </div>
          </div>
        </div>

        {/* 错误信息 */}
        {log.errorMessage && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4 text-red-800">错误信息</h2>
            <p className="text-red-700">{log.errorMessage}</p>
          </div>
        )}

        {/* AI 分析状态 */}
        {responseBody && (
          <div className="bg-white rounded-lg border p-6">
            <h2 className="text-lg font-semibold mb-4">AI 分析状态</h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">自动 AI 分析：</span>
                <Badge
                  label={responseBody.aiAnalysisCreated ? "已触发" : "未触发"}
                  className={responseBody.aiAnalysisCreated ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"}
                />
              </div>
              {responseBody.aiAnalysisId != null && (
                <div className="flex justify-between">
                  <span className="text-gray-500">AI 分析 ID：</span>
                  <Link href={`/ai-analyses/${String(responseBody.aiAnalysisId)}`} className="text-blue-600 hover:underline">
                    #{String(responseBody.aiAnalysisId)}
                  </Link>
                </div>
              )}
              {responseBody.aiAnalysisError != null && (
                <div className="flex justify-between">
                  <span className="text-gray-500">AI 错误：</span>
                  <span className="text-red-600 text-xs">{String(responseBody.aiAnalysisError)}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 请求内容 */}
      <div className="bg-white rounded-lg border p-6 mt-6">
        <h2 className="text-lg font-semibold mb-4">请求内容 (requestBody)</h2>
        {requestBody ? (
          <pre className="bg-gray-50 rounded-lg p-4 text-xs overflow-x-auto">
            {JSON.stringify(requestBody, null, 2)}
          </pre>
        ) : (
          <p className="text-gray-400">无</p>
        )}
      </div>

      {/* 响应内容 */}
      <div className="bg-white rounded-lg border p-6 mt-6">
        <h2 className="text-lg font-semibold mb-4">响应内容 (responseBody)</h2>
        {responseBody ? (
          <pre className="bg-gray-50 rounded-lg p-4 text-xs overflow-x-auto">
            {JSON.stringify(responseBody, null, 2)}
          </pre>
        ) : (
          <p className="text-gray-400">无</p>
        )}
      </div>

      {/* 排查建议 */}
      <div className="bg-white rounded-lg border p-6 mt-6">
        <h2 className="text-lg font-semibold mb-4">排查建议</h2>
        {log.status === "SUCCESS" && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-green-800 font-medium">✓ 线索已成功创建</p>
            <p className="text-green-700 text-sm mt-1">
              可以去 Lead 查看创建的线索。
              {log.createdLeadId && (
                <Link href={`/leads/${log.createdLeadId}`} className="ml-2 underline">
                  查看线索 #{log.createdLeadId}
                </Link>
              )}
            </p>
          </div>
        )}
        {log.status === "DUPLICATE" && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-yellow-800 font-medium">⚠ 重复线索检测</p>
            <p className="text-yellow-700 text-sm mt-1">
              系统检测到重复线索，请检查已有 Lead。
              {log.createdLeadId && (
                <Link href={`/leads/${log.createdLeadId}`} className="ml-2 underline">
                  查看已有线索 #{log.createdLeadId}
                </Link>
              )}
            </p>
          </div>
        )}
        {log.status === "UNAUTHORIZED" && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800 font-medium">✗ 鉴权失败</p>
            <p className="text-red-700 text-sm mt-1">
              检查 x-crm-source-code 和 x-crm-api-key 是否正确。
              确保 ExternalSource 已启用且 API Key 已配置。
            </p>
          </div>
        )}
        {log.status === "VALIDATION_ERROR" && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <p className="text-orange-800 font-medium">✗ 参数错误</p>
            <p className="text-orange-700 text-sm mt-1">
              检查 companyName、businessLineCode 等必填字段是否正确。
            </p>
          </div>
        )}
        {log.status === "FAILED" && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800 font-medium">✗ 请求失败</p>
            <p className="text-red-700 text-sm mt-1">
              检查请求 JSON 格式、CRM 服务状态和服务器日志。
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
