import Link from "next/link";
import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import { Pencil, ExternalLink } from "lucide-react";
import { DocumentTypeLabel, DocumentRelatedTypeLabel } from "@/lib/enums";
import { formatDate } from "@/lib/format";
import PageHeader from "@/components/PageHeader";
import Card from "@/components/ui/Card";
import DetailField from "@/components/ui/DetailField";
import Badge from "@/components/ui/StatusBadge";

export const dynamic = "force-dynamic";

export default async function DocumentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const document = await prisma.document.findUnique({
    where: { id: parseInt(id) },
  });

  if (!document) return notFound();

  return (
    <div className="space-y-6">
      <PageHeader
        title={document.title}
        backHref="/documents"
        actions={
          <Link href={`/documents/${document.id}/edit`} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors">
            <Pencil size={14} /> 编辑
          </Link>
        }
      />

      <Card>
        <h3 className="text-base font-semibold text-gray-900 mb-4 pb-3 border-b border-gray-100">文档信息</h3>
        <div className="space-y-1">
          <DetailField label="标题" value={document.title} />
          <DetailField label="类型" value={<Badge label={DocumentTypeLabel[document.documentType] || document.documentType} variant="info" />} />
          <DetailField label="关联类型" value={DocumentRelatedTypeLabel[document.relatedType] || document.relatedType} />
          <DetailField label="关联 ID" value={String(document.relatedId)} />
          <DetailField label="文件名" value={document.fileName} />
          <DetailField
            label="文件链接"
            value={document.fileUrl ? (
              <a href={document.fileUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center gap-1">
                <ExternalLink size={14} /> 打开链接
              </a>
            ) : null}
          />
          <DetailField label="创建时间" value={formatDate(document.createdAt)} />
        </div>
        {document.notes && (
          <div className="mt-4 pt-3 border-t border-gray-100">
            <p className="text-xs text-gray-500 mb-1">备注</p>
            <p className="text-sm">{document.notes}</p>
          </div>
        )}
      </Card>
    </div>
  );
}
