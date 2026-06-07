import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import ContactForm from "@/components/ContactForm";
import { updateContact } from "../../actions";

export default async function EditContactPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const contact = await prisma.contact.findUnique({
    where: { id: parseInt(id) },
  });

  if (!contact) return notFound();

  const customers = await prisma.customer.findMany({ orderBy: { company: "asc" } });

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">编辑联系人</h1>
      <ContactForm
        customers={customers}
        contact={contact}
        action={async (formData: FormData) => {
          "use server";
          await updateContact(contact.id, formData);
        }}
        submitLabel="保存"
      />
    </div>
  );
}
