import prisma from "@/lib/prisma";
import { CheckCircle, XCircle, AlertTriangle, Database, Server, Key, Webhook, BarChart3 } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import Card from "@/components/ui/Card";
import StatusBadge from "@/components/ui/StatusBadge";
import { isAIConfigured, getAIConfig } from "@/lib/ai/types";
import { formatDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function SystemHealthPage() {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  // 检查数据库连接
  let dbStatus = "正常";
  let dbError = "";
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (e) {
    dbStatus = "异常";
    dbError = e instanceof Error ? e.message : "未知错误";
  }

  // 检查各表数据量
  const tableChecks: Array<{ name: string; count: number; error?: string }> = [];
  const tables = [
    { name: "BusinessLine", fn: () => prisma.businessLine.count() },
    { name: "Lead", fn: () => prisma.lead.count() },
    { name: "Customer", fn: () => prisma.customer.count() },
    { name: "Project", fn: () => prisma.project.count() },
    { name: "FollowUp", fn: () => prisma.followUp.count() },
    { name: "Quote", fn: () => prisma.quote.count() },
    { name: "Task", fn: () => prisma.task.count() },
    { name: "Product", fn: () => prisma.product.count() },
    { name: "FollowUpTemplate", fn: () => prisma.followUpTemplate.count() },
    { name: "AIAnalysis", fn: () => prisma.aIAnalysis.count() },
    { name: "ExternalSource", fn: () => prisma.externalSource.count() },
    { name: "WebhookLog", fn: () => prisma.webhookLog.count() },
    { name: "ActivityLog", fn: () => prisma.activityLog.count() },
  ];

  for (const table of tables) {
    try {
      const count = await table.fn();
      tableChecks.push({ name: table.name, count });
    } catch (e) {
      tableChecks.push({ name: table.name, count: 0, error: e instanceof Error ? e.message : "查询失败" });
    }
  }

  // AI 配置状态
  const aiConfig = getAIConfig();
  const aiConfigured = isAIConfigured();

  // Webhook 状态
  const [externalSourceCount, todayWebhookSuccess, todayWebhookFailed] = await Promise.all([
    prisma.externalSource.count({ where: { isActive: true } }),
    prisma.webhookLog.count({ where: { status: "SUCCESS", createdAt: { gte: todayStart, lte: todayEnd } } }),
    prisma.webhookLog.count({ where: { status: { in: ["FAILED", "UNAUTHORIZED"] }, createdAt: { gte: todayStart, lte: todayEnd } } }),
  ]);

  // 数据量概览
  const [leadCount, customerCount, projectCount, quoteCount, taskCount, analysisCount, webhookCount] = await Promise.all([
    prisma.lead.count(),
    prisma.customer.count(),
    prisma.project.count(),
    prisma.quote.count(),
    prisma.task.count(),
    prisma.aIAnalysis.count(),
    prisma.webhookLog.count(),
  ]);

  // 逾期任务
  const overdueTasks = await prisma.task.count({
    where: { status: { in: ["PENDING", "IN_PROGRESS"] }, dueDate: { lt: now } },
  });

  // 风险提示
  const warnings: string[] = [];
  if (dbStatus !== "正常") warnings.push("数据库连接异常");
  if (!aiConfigured) warnings.push("AI Key 未配置");
  if (externalSourceCount === 0) warnings.push("没有配置外部来源");
  if (overdueTasks > 5) warnings.push(`有 ${overdueTasks} 个逾期任务`);

  return (
    <div className="space-y-6">
      <PageHeader title="系统健康检查" description="检查系统运行状态和数据完整性" />

      {/* 风险提示 */}
      {warnings.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={18} className="text-yellow-600" />
            <h3 className="font-semibold text-yellow-800">需要关注</h3>
          </div>
          <ul className="space-y-1">
            {warnings.map((w, idx) => (
              <li key={idx} className="text-sm text-yellow-700">• {w}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 数据库连接 */}
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <Database size={20} className="text-blue-500" />
            <h2 className="text-lg font-semibold">数据库连接</h2>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">状态</span>
              <StatusBadge
                label={dbStatus}
                variant={dbStatus === "正常" ? "success" : "danger"}
              />
            </div>
            {dbError && (
              <div className="p-3 bg-red-50 rounded-lg text-sm text-red-700">{dbError}</div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">容器名</span>
              <span className="text-sm font-medium">multi-business-crm-postgres</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">数据库名</span>
              <span className="text-sm font-medium">multi_business_crm</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">端口</span>
              <span className="text-sm font-medium">5433</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">连接地址</span>
              <span className="text-sm font-medium">localhost:5433</span>
            </div>
          </div>
        </Card>

        {/* AI 配置状态 */}
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <Key size={20} className="text-purple-500" />
            <h2 className="text-lg font-semibold">AI 配置状态</h2>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">AI 功能</span>
              <StatusBadge
                label={aiConfigured ? "已启用" : "未启用"}
                variant={aiConfigured ? "success" : "warning"}
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Provider</span>
              <span className="text-sm font-medium">{aiConfig.provider || "未配置"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Base URL</span>
              <span className="text-sm font-medium">{aiConfig.baseUrl ? "已配置" : "未配置"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Model</span>
              <span className="text-sm font-medium">{aiConfig.model || "未配置"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">API Key</span>
              <StatusBadge
                label={aiConfig.apiKey ? "已配置" : "未配置"}
                variant={aiConfig.apiKey ? "success" : "warning"}
              />
            </div>
          </div>
        </Card>

        {/* Webhook 状态 */}
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <Webhook size={20} className="text-teal-500" />
            <h2 className="text-lg font-semibold">Webhook 状态</h2>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">活跃来源数</span>
              <span className="text-sm font-medium">{externalSourceCount}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">今日成功</span>
              <span className="text-sm font-medium text-green-600">{todayWebhookSuccess}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">今日失败</span>
              <span className="text-sm font-medium text-red-600">{todayWebhookFailed}</span>
            </div>
          </div>
        </Card>

        {/* 数据量概览 */}
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 size={20} className="text-indigo-500" />
            <h2 className="text-lg font-semibold">数据量概览</h2>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">线索</span>
              <span className="text-sm font-medium">{leadCount}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">客户</span>
              <span className="text-sm font-medium">{customerCount}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">项目</span>
              <span className="text-sm font-medium">{projectCount}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">报价</span>
              <span className="text-sm font-medium">{quoteCount}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">任务</span>
              <span className="text-sm font-medium">{taskCount}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">AI 分析</span>
              <span className="text-sm font-medium">{analysisCount}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Webhook 日志</span>
              <span className="text-sm font-medium">{webhookCount}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">逾期任务</span>
              <span className={`text-sm font-medium ${overdueTasks > 0 ? "text-red-600" : ""}`}>{overdueTasks}</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Prisma 表检查 */}
      <Card>
        <h2 className="text-lg font-semibold mb-4">Prisma 表检查</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {tableChecks.map((table) => (
            <div key={table.name} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2">
                {table.error ? (
                  <XCircle size={16} className="text-red-500" />
                ) : (
                  <CheckCircle size={16} className="text-green-500" />
                )}
                <span className="text-sm font-medium">{table.name}</span>
              </div>
              <span className="text-sm text-gray-500">
                {table.error ? table.error : `${table.count} 条`}
              </span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
