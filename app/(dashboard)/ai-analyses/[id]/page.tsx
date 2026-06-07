import { notFound } from "next/navigation";
export const dynamic = "force-dynamic";
import prisma from "@/lib/prisma";
import { formatDateTime } from "@/lib/format";
import PageHeader from "@/components/PageHeader";
import Badge from "@/components/Badge";
import AIAnalysisResult from "@/components/AIAnalysisResult";

const targetTypeLabels: Record<string, string> = {
  LEAD: "线索",
  CUSTOMER: "客户",
  PROJECT: "项目",
  FOLLOW_UP: "跟进",
  TEMPLATE: "模板",
};

export default async function AIAnalysisDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const analysis = await prisma.aIAnalysis.findUnique({
    where: { id: parseInt(id) },
  });

  if (!analysis) return notFound();

  return (
    <div>
      <PageHeader title={analysis.title || "AI 分析详情"} backHref="/ai-analyses" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 基本信息 */}
        <div className="bg-white rounded-lg border p-6">
          <h2 className="text-lg font-semibold mb-4">基本信息</h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">对象类型：</span>
              <Badge label={targetTypeLabels[analysis.targetType] || analysis.targetType} />
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">对象 ID：</span>
              <span>{analysis.targetId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">创建时间：</span>
              <span>{formatDateTime(analysis.createdAt)}</span>
            </div>
          </div>
        </div>

        {/* 分析指标 */}
        <div className="bg-white rounded-lg border p-6 lg:col-span-2">
          <h2 className="text-lg font-semibold mb-4">分析指标</h2>
          <div className="flex flex-wrap gap-3">
            {analysis.qualificationLevel && (
              <span className="px-4 py-2 rounded-lg bg-purple-100 text-purple-700 font-medium">
                客户等级: {analysis.qualificationLevel}
              </span>
            )}
            {analysis.intentLevel && (
              <span className="px-4 py-2 rounded-lg bg-blue-100 text-blue-700 font-medium">
                意向程度: {analysis.intentLevel}
              </span>
            )}
            {analysis.buyerTypeGuess && (
              <span className="px-4 py-2 rounded-lg bg-green-100 text-green-700 font-medium">
                客户类型: {analysis.buyerTypeGuess}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 分析结果 */}
      <div className="bg-white rounded-lg border p-6 mt-6">
        <h2 className="text-lg font-semibold mb-4">分析结果</h2>
        <AIAnalysisResult analysis={analysis} />
      </div>

      {/* 原始数据 */}
      <div className="bg-white rounded-lg border p-6 mt-6">
        <h2 className="text-lg font-semibold mb-4">原始数据</h2>
        <div className="space-y-4">
          {analysis.rawInput && (
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">发送给 AI 的输入</p>
              <pre className="bg-gray-50 rounded-lg p-4 text-xs overflow-x-auto max-h-64 overflow-y-auto">
                {analysis.rawInput}
              </pre>
            </div>
          )}
          {analysis.rawOutput && (
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">AI 原始返回</p>
              <pre className="bg-gray-50 rounded-lg p-4 text-xs overflow-x-auto max-h-64 overflow-y-auto">
                {analysis.rawOutput}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
