import Link from "next/link";
import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import { Pencil, ArrowLeft } from "lucide-react";
import { formatDate } from "@/lib/format";
import PageHeader from "@/components/PageHeader";
import Card from "@/components/ui/Card";
import DetailField from "@/components/ui/DetailField";
import Badge from "@/components/ui/StatusBadge";

export const dynamic = "force-dynamic";

export default async function ContactDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const contact = await prisma.contact.findUnique({
    where: { id: parseInt(id) },
    include: { customer: true },
  });

  if (!contact) return notFound();

  return (
    <div className="space-y-6">
      <PageHeader
        title={contact.name}
        backHref="/contacts"
        actions={
          <Link href={`/contacts/${contact.id}/edit`} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors">
            <Pencil size={14} /> 编辑
          </Link>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <h3 className="text-base font-semibold text-gray-900 mb-4 pb-3 border-b border-gray-100">联系人信息</h3>
          <div className="space-y-1">
            <DetailField label="姓名" value={contact.name} />
            <DetailField label="客户" value={<Link href={`/customers/${contact.customerId}`} className="text-blue-600 hover:underline">{contact.customer.company}</Link>} />
            <DetailField label="职位" value={contact.position} />
            <DetailField label="邮箱" value={contact.email} />
            <DetailField label="WhatsApp" value={contact.whatsapp} />
            <DetailField label="电话" value={contact.phone} />
            <DetailField label="微信" value={contact.wechat} />
            <DetailField label="LinkedIn" value={contact.linkedin} />
            <DetailField label="主联系人" value={contact.isPrimary ? "是" : "否"} />
            <DetailField label="创建时间" value={formatDate(contact.createdAt)} />
          </div>
        </Card>

        {contact.notes && (
          <Card>
            <h3 className="text-base font-semibold text-gray-900 mb-4 pb-3 border-b border-gray-100">备注</h3>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{contact.notes}</p>
          </Card>
        )}
      </div>
    </div>
  );
}
