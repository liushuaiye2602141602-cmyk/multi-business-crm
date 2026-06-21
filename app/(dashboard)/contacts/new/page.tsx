import prisma from "@/lib/prisma";
export const dynamic = "force-dynamic";
import ContactForm from "@/components/ContactForm";
import { createContact } from "../actions";

export default async function NewContactPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const defaultCustomerId = typeof params.customerId === "string" ? parseInt(params.customerId) : undefined;

  const customers = await prisma.customer.findMany({
    select: { id: true, company: true },
    orderBy: { company: "asc" },
  });

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">新增联系人</h1>
      <ContactForm
        customers={customers}
        defaultCustomerId={defaultCustomerId}
        action={createContact}
        submitLabel="创建"
      />
    </div>
  );
}
