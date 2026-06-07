import Link from "next/link";
export const dynamic = "force-dynamic";
import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import { Pencil } from "lucide-react";
import { TemplateSceneLabel, TemplateLanguageLabel } from "@/lib/enums";
import { formatDate } from "@/lib/format";
import { isAIConfigured } from "@/lib/ai/types";
import { rewriteTemplate } from "@/lib/ai/actions";
import PageHeader from "@/components/PageHeader";
import Badge from "@/components/Badge";
import TemplateAISection from "@/components/TemplateAISection";

export default async function TemplateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const templateId = parseInt(id);

  const [template, latestAnalysis] = await Promise.all([
    prisma.followUpTemplate.findUnique({
      where: { id: templateId },
      include: { businessLine: true },
    }),
    prisma.aIAnalysis.findFirst({
      where: { targetType: "TEMPLATE", targetId: templateId },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  if (!template) return notFound();

  const aiConfigured = isAIConfigured();

  return (
    <div>
      <PageHeader
        title={template.title}
        backHref="/templates"
        action={{ label: "编辑", href: `/templates/${template.id}/edit`, icon: <Pencil size={16} /> }}
      />

      <div className="bg-white rounded-lg border p-6 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <Badge label={TemplateSceneLabel[template.scene] || template.scene} />
          <Badge label={TemplateLanguageLabel[template.language] || template.language} />
          <Badge label={template.isActive ? "启用" : "停用"}
            className={template.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"} />
          {template.businessLine && <span className="text-sm text-gray-500">{template.businessLine.name}</span>}
        </div>

        <div className="space-y-3 text-sm mb-6">
          <div className="flex justify-between"><span className="text-gray-500">标题：</span><span className="font-medium">{template.title}</span></div>
          {template.subject && <div className="flex justify-between"><span className="text-gray-500">邮件主题：</span>{template.subject}</div>}
          <div className="flex justify-between"><span className="text-gray-500">创建时间：</span>{formatDate(template.createdAt)}</div>
        </div>

        {template.notes && (
          <div className="mb-4 p-3 bg-yellow-50 rounded-lg">
            <p className="text-sm text-yellow-800">{template.notes}</p>
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg border p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">模板内容</h2>
        <div className="bg-gray-50 rounded-lg p-4 whitespace-pre-wrap text-sm font-mono">
          {template.content}
        </div>
      </div>

      {/* AI 改写 */}
      <TemplateAISection
        templateId={templateId}
        isAIConfigured={aiConfigured}
        latestAnalysis={latestAnalysis}
      />
    </div>
  );
}
