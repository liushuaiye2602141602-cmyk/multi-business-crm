import Link from "next/link";
import prisma from "@/lib/prisma";
import { Eye, FolderKanban } from "lucide-react";
import { ProjectStatusLabel, LeadGradeLabel } from "@/lib/enums";
import { formatDate, formatMoney } from "@/lib/format";
import { getProjectStatusVariant, getLeadGradeVariant } from "@/components/ui/StatusBadge";
import StatusBadge from "@/components/ui/StatusBadge";
import PageHeader from "@/components/PageHeader";
import Card from "@/components/ui/Card";

export const dynamic = "force-dynamic";

const PIPELINE_STAGES = [
  { status: "REQUIREMENT_CONFIRMING", label: "需求确认", color: "border-blue-400 bg-blue-50" },
  { status: "QUOTING", label: "报价中", color: "border-purple-400 bg-purple-50" },
  { status: "SAMPLE_TESTING", label: "样品测试", color: "border-orange-400 bg-orange-50" },
  { status: "WAITING_FEEDBACK", label: "等待反馈", color: "border-yellow-400 bg-yellow-50" },
  { status: "NEGOTIATING", label: "洽谈中", color: "border-indigo-400 bg-indigo-50" },
  { status: "WON", label: "已成交", color: "border-green-400 bg-green-50" },
  { status: "LOST", label: "已丢单", color: "border-red-400 bg-red-50" },
  { status: "PAUSED", label: "暂停", color: "border-gray-400 bg-gray-50" },
];

export default async function PipelinePage() {
  const projects = await prisma.project.findMany({
    orderBy: { updatedAt: "desc" },
    include: {
      customer: true,
      businessLine: true,
      _count: { select: { quotes: true, followUps: true, tasks: true } },
    },
  });

  // 按状态分组
  const projectsByStatus = PIPELINE_STAGES.map(stage => {
    const stageProjects = projects.filter(p => p.status === stage.status);
    const totalAmount = stageProjects.reduce((sum, p) => sum + (p.amount ? Number(p.amount) : 0), 0);
    return {
      ...stage,
      projects: stageProjects,
      count: stageProjects.length,
      totalAmount,
    };
  });

  return (
    <div>
      <PageHeader
        title="商机漏斗"
        description="查看所有商机项目的阶段分布"
        actions={
          <div className="flex items-center gap-2">
            <Link href="/projects" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors">
              列表视图
            </Link>
            <Link href="/projects/pipeline" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors">
              漏斗视图
            </Link>
            <Link href="/projects/new" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-green-600 text-white hover:bg-green-700 transition-colors">
              新增项目
            </Link>
          </div>
        }
      />

      {/* 漏斗统计 */}
      <div className="grid grid-cols-4 md:grid-cols-8 gap-3 mb-6">
        {projectsByStatus.map((stage) => (
          <div key={stage.status} className={`text-center p-3 rounded-lg border ${stage.color}`}>
            <p className="text-lg font-bold">{stage.count}</p>
            <p className="text-xs text-gray-600">{stage.label}</p>
            {stage.totalAmount > 0 && (
              <p className="text-xs text-gray-500 mt-1">{formatMoney(stage.totalAmount)}</p>
            )}
          </div>
        ))}
      </div>

      {/* 漏斗看板 */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {projectsByStatus.map((stage) => (
          <div key={stage.status} className="flex-shrink-0 w-72">
            <div className={`rounded-lg border-2 ${stage.color} p-3 mb-3`}>
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm">{stage.label}</h3>
                <span className="text-xs text-gray-500">{stage.count} 个项目</span>
              </div>
              {stage.totalAmount > 0 && (
                <p className="text-xs text-gray-500 mt-1">合计: {formatMoney(stage.totalAmount)}</p>
              )}
            </div>
            <div className="space-y-3 min-h-[200px]">
              {stage.projects.map((project) => (
                <div key={project.id} className="bg-white rounded-lg border border-gray-200 shadow-sm p-3 hover:shadow-md transition-shadow">
                  <Link href={`/projects/${project.id}`} className="text-sm font-medium text-gray-900 hover:text-blue-600 block mb-2">
                    {project.name}
                  </Link>
                  <p className="text-xs text-gray-500 mb-2">{project.customer.company}</p>
                  {project.productName && (
                    <p className="text-xs text-gray-600 mb-2">{project.productName}</p>
                  )}
                  <div className="flex items-center justify-between">
                    {project.amount ? (
                      <span className="text-xs font-medium">{formatMoney(Number(project.amount), project.currency)}</span>
                    ) : (
                      <span className="text-xs text-gray-400">-</span>
                    )}
                    <Link href={`/projects/${project.id}`} className="text-xs text-blue-600 hover:underline">
                      查看
                    </Link>
                  </div>
                  <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-100">
                    <span className="text-xs text-gray-400">报价: {project._count.quotes}</span>
                    <span className="text-xs text-gray-400">跟进: {project._count.followUps}</span>
                    <span className="text-xs text-gray-400">任务: {project._count.tasks}</span>
                  </div>
                </div>
              ))}
              {stage.projects.length === 0 && (
                <div className="text-center py-8 text-gray-400 text-sm">
                  暂无项目
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
