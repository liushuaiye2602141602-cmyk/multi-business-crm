import Link from "next/link";
import prisma from "@/lib/prisma";
import { Pencil } from "lucide-react";
import { deleteTemplate } from "./actions";
import { TemplateSceneLabel, TemplateLanguageLabel } from "@/lib/enums";
import PageHeader from "@/components/PageHeader";
import Badge from "@/components/Badge";
import EmptyState from "@/components/EmptyState";
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
        action={{ label: "新增模板", href: "/templates/new" }}
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

      <div className="bg-white rounded-lg border overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="text-left py-3 px-4 font-medium text-gray-600">标题</th>
              <th className="text-left py-3 px-4 font-medium text-gray-600">场景</th>
              <th className="text-left py-3 px-4 font-medium text-gray-600">业务线</th>
              <th className="text-left py-3 px-4 font-medium text-gray-600">语言</th>
              <th className="text-left py-3 px-4 font-medium text-gray-600">状态</th>
              <th className="text-left py-3 px-4 font-medium text-gray-600">操作</th>
            </tr>
          </thead>
          <tbody>
            {templates.map((template) => (
              <tr key={template.id} className="border-b last:border-0 hover:bg-gray-50">
                <td className="py-3 px-4 font-medium">
                  <Link href={`/templates/${template.id}`} className="hover:text-blue-600">{template.title}</Link>
                </td>
                <td className="py-3 px-4">
                  <Badge label={TemplateSceneLabel[template.scene] || template.scene} />
                </td>
                <td className="py-3 px-4">{template.businessLine?.name || "通用"}</td>
                <td className="py-3 px-4">{TemplateLanguageLabel[template.language] || template.language}</td>
                <td className="py-3 px-4">
                  <Badge label={template.isActive ? "启用" : "停用"}
                    className={template.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"} />
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-1">
                    <Link href={`/templates/${template.id}/edit`} className="p-1 text-gray-400 hover:text-blue-600">
                      <Pencil size={16} />
                    </Link>
                    <ConfirmDeleteButton action={async () => { "use server"; await deleteTemplate(template.id); }} />
                  </div>
                </td>
              </tr>
            ))}
            {templates.length === 0 && (
              <tr>
                <td colSpan={6}>
                  <EmptyState
                    message={hasFilters ? "没有找到匹配的模板" : "暂无跟进模板，请点击右上角新增模板"}
                    actionLabel={hasFilters ? undefined : "新增模板"}
                    actionHref={hasFilters ? undefined : "/templates/new"}
                  />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
