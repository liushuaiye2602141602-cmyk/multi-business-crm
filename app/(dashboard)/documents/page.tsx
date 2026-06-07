import Link from "next/link";
import prisma from "@/lib/prisma";
import { Eye, Pencil, Plus, ExternalLink } from "lucide-react";
import { deleteDocument } from "./actions";
import { DocumentTypeLabel, DocumentRelatedTypeLabel } from "@/lib/enums";
import { formatDate } from "@/lib/format";
import PageHeader from "@/components/PageHeader";
import Card from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import ConfirmDeleteButton from "@/components/ConfirmDeleteButton";
import SearchFilterBar from "@/components/SearchFilterBar";
import Badge from "@/components/ui/StatusBadge";

export const dynamic = "force-dynamic";

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const search = typeof params.search === "string" ? params.search : "";
  const documentType = typeof params.documentType === "string" ? params.documentType : "";
  const relatedType = typeof params.relatedType === "string" ? params.relatedType : "";

  const where: Record<string, unknown> = {};
  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { fileName: { contains: search, mode: "insensitive" } },
      { notes: { contains: search, mode: "insensitive" } },
    ];
  }
  if (documentType) where.documentType = documentType;
  if (relatedType) where.relatedType = relatedType;

  const documents = await prisma.document.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });

  const hasFilters = search || documentType || relatedType;

  return (
    <div>
      <PageHeader
        title="文档资料"
        description="管理客户资料、报价文件、合同、设计稿等"
        actions={
          <Link href="/documents/new" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors">
            <Plus size={16} />
            新增文档
          </Link>
        }
      />

      <SearchFilterBar
        searchPlaceholder="搜索标题、文件名、备注..."
        filters={[
          { name: "documentType", label: "文档类型", options: Object.entries(DocumentTypeLabel).map(([value, label]) => ({ value, label })) },
          { name: "relatedType", label: "关联类型", options: Object.entries(DocumentRelatedTypeLabel).map(([value, label]) => ({ value, label })) },
        ]}
        defaultSearch={search}
        defaultFilters={{ documentType, relatedType }}
      />

      <Card padding="none">
        {documents.length === 0 ? (
          <EmptyState
            message={hasFilters ? "没有找到匹配的文档" : "暂无文档"}
            description={hasFilters ? "请调整筛选条件" : "点击右上角新增文档开始记录"}
            actionLabel={hasFilters ? undefined : "新增文档"}
            actionHref={hasFilters ? undefined : "/documents/new"}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-600 text-xs uppercase tracking-wider">标题</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-600 text-xs uppercase tracking-wider">类型</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-600 text-xs uppercase tracking-wider">关联类型</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-600 text-xs uppercase tracking-wider">文件</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-600 text-xs uppercase tracking-wider">创建时间</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-600 text-xs uppercase tracking-wider">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {documents.map((doc) => (
                  <tr key={doc.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="py-3 px-4 font-medium">{doc.title}</td>
                    <td className="py-3 px-4">
                      <Badge label={DocumentTypeLabel[doc.documentType] || doc.documentType} variant="info" />
                    </td>
                    <td className="py-3 px-4 text-gray-600">{DocumentRelatedTypeLabel[doc.relatedType] || doc.relatedType}</td>
                    <td className="py-3 px-4">
                      {doc.fileUrl ? (
                        <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center gap-1">
                          <ExternalLink size={14} />
                          {doc.fileName || "打开链接"}
                        </a>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-gray-500">{formatDate(doc.createdAt)}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-end gap-1">
                        <Link href={`/documents/${doc.id}`} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors">
                          <Eye size={16} />
                        </Link>
                        <Link href={`/documents/${doc.id}/edit`} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors">
                          <Pencil size={16} />
                        </Link>
                        <ConfirmDeleteButton action={async () => { "use server"; await deleteDocument(doc.id); }} />
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
