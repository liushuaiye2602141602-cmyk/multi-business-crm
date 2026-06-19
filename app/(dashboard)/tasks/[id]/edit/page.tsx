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

  const taskData = {
    id: task.id,
    title: task.title,
    description: task.description || "",
    type: task.type,
    status: task.status,
    priority: task.priority,
    dueDate: task.dueDate ? task.dueDate.toISOString().slice(0, 10) : "",
    leadId: task.leadId,
    customerId: task.customerId,
    projectId: task.projectId,
  };

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold mb-6">编辑任务</h1>
      <TaskForm
        leads={leads}
        customers={customers}
        projects={projects}
        task={taskData}
        action={async (formData: FormData) => {
          "use server";
          await updateTask(task.id, formData);
        }}
        submitLabel="保存"
      />
    </div>
  );
}
