import Link from "next/link";
import prisma from "@/lib/prisma";
import { Pencil, Plus } from "lucide-react";
import { deleteTemplate } from "./actions";
import { TemplateSceneLabel, TemplateLanguageLabel } from "@/lib/enums";
import StatusBadge from "@/components/ui/StatusBadge";
import PageHeader from "@/components/PageHeader";
import Card from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import ConfirmDeleteButton from "@/components/ConfirmDeleteButton";
import SearchFilterBar from "@/components/SearchFilterBar";

export const dynamic = "force-dynamic";

export default async function TemplatesPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const search = typeof params.search === "string" ? params.search : "";
  const scene = typeof params.scene === "string" ? params.scene : "";
  const language = typeof params.language === "string" ? params.language : "";
  const businessLineId = typeof params.businessLineId === "string" ? params.businessLineId : "";

  const where: Record<string, unknown> = {};
  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { content: { contains: search, mode: "insensitive" } },
      { subject: { contains: search, mode: "insensitive" } },
    ];
  }
  if (scene) where.scene = scene;
  if (language) where.language = language;
  if (businessLineId) where.businessLineId = parseInt(businessLineId);

  const [templates, businessLines] = await Promise.all([
    prisma.followUpTemplate.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: { businessLine: true },
    }),
    prisma.businessLine.findMany({ orderBy: { name: "asc" } }),
  ]);

  const hasFilters = search || scene || language || businessLineId;

  return (
    <div>
      <PageHeader
        title="跟进模板"
        description="管理常用外贸跟进话术模板"
        actions={
          <Link href="/templates/new" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors">
            <Plus size={16} />
            新增模板
          </Link>
        }
      />

      <SearchFilterBar
        searchPlaceholder="搜索模板标题、内容..."
        filters={[
          { name: "scene", label: "场景", options: Object.entries(TemplateSceneLabel).map(([value, label]) => ({ value, label })) },
          { name: "language", label: "语言", options: Object.entries(TemplateLanguageLabel).map(([value, label]) => ({ value, label })) },
          { name: "businessLineId", label: "业务线", options: businessLines.map((bl) => ({ value: String(bl.id), label: bl.name })) },
        ]}
        defaultSearch={search}
        defaultFilters={{ scene, language, businessLineId }}
      />

      <Card padding="none">
        {templates.length === 0 ? (
          <EmptyState
            message={hasFilters ? "没有找到匹配的模板" : "暂无跟进模板"}
            description={hasFilters ? "请调整筛选条件" : "点击右上角新增模板开始记录"}
            actionLabel={hasFilters ? undefined : "新增模板"}
            actionHref={hasFilters ? undefined : "/templates/new"}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-600 text-xs uppercase tracking-wider">标题</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600 text-xs uppercase tracking-wider">场景</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600 text-xs uppercase tracking-wider">业务线</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600 text-xs uppercase tracking-wider">语言</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600 text-xs uppercase tracking-wider">状态</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-600 text-xs uppercase tracking-wider">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {templates.map((template) => (
                  <tr key={template.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-4">
                      <Link href={`/templates/${template.id}`} className="font-medium text-gray-900 hover:text-blue-600">
                        {template.title}
                      </Link>
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge label={TemplateSceneLabel[template.scene] || template.scene} variant="info" />
                    </td>
                    <td className="py-3 px-4 text-gray-600">{template.businessLine?.name || "通用"}</td>
                    <td className="py-3 px-4 text-gray-600">{TemplateLanguageLabel[template.language] || template.language}</td>
                    <td className="py-3 px-4">
                      <StatusBadge
                        label={template.isActive ? "启用" : "停用"}
                        variant={template.isActive ? "success" : "default"}
                      />
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-end gap-1">
                        <Link href={`/templates/${template.id}/edit`} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors">
                          <Pencil size={16} />
                        </Link>
                        <ConfirmDeleteButton action={async () => { "use server"; await deleteTemplate(template.id); }} />
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
