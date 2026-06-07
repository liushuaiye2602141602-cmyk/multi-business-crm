import Link from "next/link";
import prisma from "@/lib/prisma";
import { Eye, Trash2 } from "lucide-react";
import { deleteAIAnalysis } from "./actions";
import { formatDateTime } from "@/lib/format";
import StatusBadge from "@/components/ui/StatusBadge";
import PageHeader from "@/components/PageHeader";
import Card from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import SearchFilterBar from "@/components/SearchFilterBar";

export const dynamic = "force-dynamic";

const targetTypeLabels: Record<string, string> = {
  LEAD: "线索",
  CUSTOMER: "客户",
  PROJECT: "项目",
  FOLLOW_UP: "跟进",
  TEMPLATE: "模板",
};

const targetTypeVariants: Record<string, "info" | "success" | "warning" | "purple" | "default"> = {
  LEAD: "info",
  CUSTOMER: "success",
  PROJECT: "purple",
  FOLLOW_UP: "warning",
  TEMPLATE: "default",
};

export default async function AIAnalysesPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const search = typeof params.search === "string" ? params.search : "";
  const targetType = typeof params.targetType === "string" ? params.targetType : "";
  const qualificationLevel = typeof params.qualificationLevel === "string" ? params.qualificationLevel : "";
  const intentLevel = typeof params.intentLevel === "string" ? params.intentLevel : "";

  const where: Record<string, unknown> = {};
  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { summary: { contains: search, mode: "insensitive" } },
      { nextAction: { contains: search, mode: "insensitive" } },
    ];
  }
  if (targetType) where.targetType = targetType;
  if (qualificationLevel) where.qualificationLevel = qualificationLevel;
  if (intentLevel) where.intentLevel = intentLevel;

  const analyses = await prisma.aIAnalysis.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const hasFilters = search || targetType || qualificationLevel || intentLevel;

  return (
    <div>
      <PageHeader
        title="AI 分析记录"
        description="查看所有 AI 分析结果"
      />

      <SearchFilterBar
        searchPlaceholder="搜索标题、摘要、下一步动作..."
        filters={[
          { name: "targetType", label: "对象类型", options: Object.entries(targetTypeLabels).map(([value, label]) => ({ value, label })) },
          { name: "qualificationLevel", label: "客户等级", options: [{ value: "A", label: "A" }, { value: "B", label: "B" }, { value: "C", label: "C" }, { value: "D", label: "D" }] },
          { name: "intentLevel", label: "意向程度", options: [{ value: "High", label: "高" }, { value: "Medium", label: "中" }, { value: "Low", label: "低" }] },
        ]}
        defaultSearch={search}
        defaultFilters={{ targetType, qualificationLevel, intentLevel }}
      />

      <Card padding="none">
        {analyses.length === 0 ? (
          <EmptyState
            message={hasFilters ? "没有找到匹配的分析记录" : "暂无 AI 分析记录"}
            description={hasFilters ? "请调整筛选条件" : "在线索、客户、项目等详情页可使用 AI 分析功能"}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-600 text-xs uppercase tracking-wider">时间</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600 text-xs uppercase tracking-wider">对象类型</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600 text-xs uppercase tracking-wider">标题</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600 text-xs uppercase tracking-wider">等级</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600 text-xs uppercase tracking-wider">意向</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600 text-xs uppercase tracking-wider">摘要</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600 text-xs uppercase tracking-wider">下一步</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-600 text-xs uppercase tracking-wider">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {analyses.map((analysis) => (
                  <tr key={analysis.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-4 text-gray-500 whitespace-nowrap">{formatDateTime(analysis.createdAt)}</td>
                    <td className="py-3 px-4">
                      <StatusBadge
                        label={targetTypeLabels[analysis.targetType] || analysis.targetType}
                        variant={targetTypeVariants[analysis.targetType] || "default"}
                      />
                    </td>
                    <td className="py-3 px-4 font-medium text-gray-900 max-w-[200px] truncate">{analysis.title || "-"}</td>
                    <td className="py-3 px-4">
                      {analysis.qualificationLevel ? (
                        <StatusBadge
                          label={analysis.qualificationLevel}
                          variant={analysis.qualificationLevel === "A" ? "success" : analysis.qualificationLevel === "B" ? "info" : analysis.qualificationLevel === "C" ? "warning" : "default"}
                        />
                      ) : "-"}
                    </td>
                    <td className="py-3 px-4">
                      {analysis.intentLevel ? (
                        <StatusBadge
                          label={analysis.intentLevel}
                          variant={analysis.intentLevel === "High" ? "success" : analysis.intentLevel === "Medium" ? "warning" : "default"}
                        />
                      ) : "-"}
                    </td>
                    <td className="py-3 px-4 text-gray-600 max-w-[200px] truncate">{analysis.summary || "-"}</td>
                    <td className="py-3 px-4 text-gray-600 max-w-[200px] truncate">{analysis.nextAction || "-"}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-end gap-1">
                        <Link href={`/ai-analyses/${analysis.id}`} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors">
                          <Eye size={16} />
                        </Link>
                        <form action={async () => { "use server"; await deleteAIAnalysis(analysis.id); }}>
                          <button type="submit" className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors">
                            <Trash2 size={16} />
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
