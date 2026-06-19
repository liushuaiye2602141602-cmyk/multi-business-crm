import { notFound } from "next/navigation";
export const dynamic = "force-dynamic";
import prisma from "@/lib/prisma";
import FollowUpForm from "@/components/FollowUpForm";
import { updateFollowUp } from "../../actions";

export default async function EditFollowUpPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const followUp = await prisma.followUp.findUnique({
    where: { id: parseInt(id) },
  });

  if (!followUp) return notFound();

  const [leads, customers, projects] = await Promise.all([
    prisma.lead.findMany({
      select: { id: true, company: true, contactName: true },
      orderBy: { company: "asc" },
    }),
    prisma.customer.findMany({
      select: { id: true, company: true },
      orderBy: { company: "asc" },
    }),
    prisma.project.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold mb-6">编辑跟进记录</h1>
      <FollowUpForm
        leads={leads}
        customers={customers}
        projects={projects}
        followUp={followUp}
        action={async (formData: FormData) => {
          "use server";
          await updateFollowUp(followUp.id, formData);
        }}
        submitLabel="保存"
      />
    </div>
  );
}
