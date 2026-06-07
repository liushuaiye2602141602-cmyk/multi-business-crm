import { notFound } from "next/navigation";
export const dynamic = "force-dynamic";
import prisma from "@/lib/prisma";
import TaskForm from "@/components/TaskForm";
import { updateTask } from "../../actions";

export default async function EditTaskPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const task = await prisma.task.findUnique({
    where: { id: parseInt(id) },
  });

  if (!task) return notFound();

  const [leads, customers, projects] = await Promise.all([
    prisma.lead.findMany({ orderBy: { company: "asc" } }),
    prisma.customer.findMany({ orderBy: { company: "asc" } }),
    prisma.project.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold mb-6">编辑任务</h1>
      <TaskForm
        leads={leads}
        customers={customers}
        projects={projects}
        task={task}
        action={async (formData: FormData) => {
          "use server";
          await updateTask(task.id, formData);
        }}
        submitLabel="保存"
      />
    </div>
  );
}
