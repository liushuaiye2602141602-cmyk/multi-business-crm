import Link from "next/link";
import prisma from "@/lib/prisma";
import { Eye, Pencil, Plus } from "lucide-react";
import { deleteContact } from "./actions";
import { formatDate } from "@/lib/format";
import PageHeader from "@/components/PageHeader";
import Card from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import ConfirmDeleteButton from "@/components/ConfirmDeleteButton";
import SearchFilterBar from "@/components/SearchFilterBar";

export const dynamic = "force-dynamic";

export default async function ContactsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const search = typeof params.search === "string" ? params.search : "";
  const customerId = typeof params.customerId === "string" ? params.customerId : "";

  const where: Record<string, unknown> = {};
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
      { whatsapp: { contains: search, mode: "insensitive" } },
      { customer: { company: { contains: search, mode: "insensitive" } } },
    ];
  }
  if (customerId) where.customerId = parseInt(customerId);

  const [contacts, customers] = await Promise.all([
    prisma.contact.findMany({
      where,
      orderBy: [{ isPrimary: "desc" }, { createdAt: "desc" }],
      include: { customer: true },
    }),
    prisma.customer.findMany({ orderBy: { company: "asc" } }),
  ]);

  const hasFilters = search || customerId;

  return (
    <div>
      <PageHeader
        title="联系人管理"
        description="管理客户公司的多个联系人"
        actions={
          <Link href="/contacts/new" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors">
            <Plus size={16} />
            新增联系人
          </Link>
        }
      />

      <SearchFilterBar
        searchPlaceholder="搜索姓名、邮箱、WhatsApp、公司名..."
        filters={[
          { name: "customerId", label: "客户", options: customers.map((c) => ({ value: String(c.id), label: c.company })) },
        ]}
        defaultSearch={search}
        defaultFilters={{ customerId }}
      />

      <Card padding="none">
        {contacts.length === 0 ? (
          <EmptyState
            message={hasFilters ? "没有找到匹配的联系人" : "暂无联系人"}
            description={hasFilters ? "请调整筛选条件" : "点击右上角新增联系人开始记录"}
            actionLabel={hasFilters ? undefined : "新增联系人"}
            actionHref={hasFilters ? undefined : "/contacts/new"}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-600 text-xs uppercase tracking-wider">姓名</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-600 text-xs uppercase tracking-wider">客户</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-600 text-xs uppercase tracking-wider">职位</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-600 text-xs uppercase tracking-wider">邮箱</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-600 text-xs uppercase tracking-wider">WhatsApp</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-600 text-xs uppercase tracking-wider">主联系人</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-600 text-xs uppercase tracking-wider">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {contacts.map((contact) => (
                  <tr key={contact.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="py-3 px-4">
                      <Link href={`/contacts/${contact.id}`} className="font-medium text-gray-900 hover:text-blue-600">
                        {contact.name}
                      </Link>
                    </td>
                    <td className="py-3 px-4">
                      <Link href={`/customers/${contact.customerId}`} className="text-gray-600 hover:text-blue-600">
                        {contact.customer.company}
                      </Link>
                    </td>
                    <td className="py-3 px-4 text-gray-600">{contact.position || "-"}</td>
                    <td className="py-3 px-4 text-gray-600">{contact.email || "-"}</td>
                    <td className="py-3 px-4 text-gray-600">{contact.whatsapp || "-"}</td>
                    <td className="py-3 px-4">
                      {contact.isPrimary && <Badge label="主联系人" variant="success" />}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-end gap-1">
                        <Link href={`/contacts/${contact.id}`} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors">
                          <Eye size={16} />
                        </Link>
                        <Link href={`/contacts/${contact.id}/edit`} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors">
                          <Pencil size={16} />
                        </Link>
                        <ConfirmDeleteButton action={async () => { "use server"; await deleteContact(contact.id); }} />
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

// Badge component import
import Badge from "@/components/ui/StatusBadge";
