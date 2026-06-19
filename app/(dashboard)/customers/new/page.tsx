import prisma from "@/lib/prisma";
export const dynamic = "force-dynamic";
import CustomerForm from "@/components/CustomerForm";
import { createCustomer } from "../actions";

export default async function NewCustomerPage() {
  const businessLines = await prisma.businessLine.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold mb-6">新增客户</h1>
      <CustomerForm
        businessLines={businessLines}
        action={createCustomer}
        submitLabel="创建"
      />
    </div>
  );
}
