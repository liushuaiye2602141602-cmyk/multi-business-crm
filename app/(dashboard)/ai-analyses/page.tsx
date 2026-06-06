import Link from "next/link";
import prisma from "@/lib/prisma";
import { Eye, Trash2 } from "lucide-react";
import { deleteAIAnalysis } from "./actions";
import { formatDateTime } from "@/lib/format";
import PageHeader from "@/components/PageHeader";
import Badge from "@/components/Badge";
import EmptyState from "@/components/EmptyState";
import SearchFilterBar from "@/components/SearchFilterBar";

export const dynamic = "force-dynamic";

const targetTypeLabels: Record<string, string> = {
  LEAD: "线索",
  CUSTOMER: "客户",
  PROJECT: "项目",
  FOLLOW_UP: "跟进",
  TEMPLATE: "模板",
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

  const qualificationColors: Record<string, string> = {
    A: "bg-red-100 text-red-700",
    B: "bg-orange-100 text-orange-700",
    C: "bg-blue-100 text-blue-700",
    D: "bg-gray-100 text-gray-700",
  };

  const intentColors: Record<string, string> = {
    High: "bg-green-100 text-green-700",
    Medium: "bg-yellow-100 text-yellow-700",
    Low: "bg-gray-100 text-gray-700",
    Unknown: "bg-gray-100 text-gray-700",
  };

  return (
    <div>
      <PageHeader title="AI 分析记录" />

      <SearchFilterBar
        searchPlaceholder="搜索标题、摘要、下一步动作..."
        filters={[
          { name: "targetType", label: "对象类型", options: Object.entries(targetTypeLabels).map(([value, label]) => ({ value, label })) },
          { name: "qualificationLevel", label: "客户等级", options: [{ value: "A", label: "A" }, { value: "B", label: "B" }, { value: "C", label: "C" }, { value: "D", label: "D" }] },
          { name: "intentLevel", label: "意向程度", options: [{ value: "High", label: "High" }, { value: "Medium", label: "Medium" }, { value: "Low", label: "Low" }] },
        ]}
        defaultSearch={search}
        defaultFilters={{ targetType, qualificationLevel, intentLevel }}
      />

      <div className="bg-white rounded-lg border">
        {analyses.length === 0 ? (
          <EmptyState message={hasFilters ? "没有找到匹配的分析记录" : "暂无 AI 分析记录，在线索、客户、项目等详情页可使用 AI 分析功能"} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left py-3 px-4 font-medium text-gray-600">时间</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">对象类型</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">标题</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">等级</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">意向</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">摘要</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">下一步</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">操作</th>
                </tr>
              </thead>
              <tbody>
                {analyses.map((analysis) => (
                  <tr key={analysis.id} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="py-3 px-4 text-gray-500 whitespace-nowrap">{formatDateTime(analysis.createdAt)}</td>
                    <td className="py-3 px-4">
                      <Badge label={targetTypeLabels[analysis.targetType] || analysis.targetType} />
                    </td>
                    <td className="py-3 px-4 font-medium max-w-[200px] truncate">{analysis.title || "-"}</td>
                    <td className="py-3 px-4">
                      {analysis.qualificationLevel ? (
                        <Badge
                          label={analysis.qualificationLevel}
                          className={qualificationColors[analysis.qualificationLevel] || "bg-gray-100 text-gray-700"}
                        />
                      ) : "-"}
                    </td>
                    <td className="py-3 px-4">
                      {analysis.intentLevel ? (
                        <Badge
                          label={analysis.intentLevel}
                          className={intentColors[analysis.intentLevel] || "bg-gray-100 text-gray-700"}
                        />
                      ) : "-"}
                    </td>
                    <td className="py-3 px-4 text-gray-600 max-w-[200px] truncate">{analysis.summary || "-"}</td>
                    <td className="py-3 px-4 text-gray-600 max-w-[200px] truncate">{analysis.nextAction || "-"}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1">
                        <Link href={`/ai-analyses/${analysis.id}`} className="p-1 text-gray-400 hover:text-blue-600">
                          <Eye size={16} />
                        </Link>
                        <form action={async () => { "use server"; await deleteAIAnalysis(analysis.id); }}>
                          <button type="submit" className="p-1 text-gray-400 hover:text-red-600">
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
      </div>
    </div>
  );
}
