import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import CustomerForm from "@/components/CustomerForm";
import { updateCustomer } from "../../actions";

export default async function EditCustomerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const customer = await prisma.customer.findUnique({
    where: { id: parseInt(id) },
  });

  if (!customer) return notFound();

  const businessLines = await prisma.businessLine.findMany({ orderBy: { name: "asc" } });

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold mb-6">编辑客户</h1>
      <CustomerForm
        businessLines={businessLines}
        customer={customer}
        action={async (formData: FormData) => {
          "use server";
          await updateCustomer(customer.id, formData);
        }}
        submitLabel="保存"
      />
    </div>
  );
}
