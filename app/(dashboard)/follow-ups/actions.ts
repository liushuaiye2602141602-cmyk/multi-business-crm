"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { FollowUpMethod } from "@/lib/generated/prisma/enums";

export async function createFollowUp(formData: FormData) {
  const data = {
    method: (formData.get("method") as FollowUpMethod) || "EMAIL",
    content: formData.get("content") as string,
    customerFeedback: (formData.get("customerFeedback") as string) || null,
    nextAction: (formData.get("nextAction") as string) || null,
    followUpDate: formData.get("followUpDate")
      ? new Date(formData.get("followUpDate") as string)
      : new Date(),
    nextFollowUpDate: formData.get("nextFollowUpDate")
      ? new Date(formData.get("nextFollowUpDate") as string)
      : null,
    remark: (formData.get("remark") as string) || null,
    leadId: formData.get("leadId") ? parseInt(formData.get("leadId") as string) : null,
    customerId: formData.get("customerId") ? parseInt(formData.get("customerId") as string) : null,
    projectId: formData.get("projectId") ? parseInt(formData.get("projectId") as string) : null,
  };

  if (!data.content) throw new Error("跟进内容不能为空");

  if (!data.leadId && !data.customerId && !data.projectId) {
    throw new Error("请至少选择一个关联对象（线索、客户或项目）");
  }

  const followUp = await prisma.followUp.create({ data });

  // 如果填写了下次跟进日期，自动创建任务
  if (data.nextFollowUpDate) {
    let taskTitle = "跟进任务";
    if (data.customerId) {
      const customer = await prisma.customer.findUnique({ where: { id: data.customerId } });
      taskTitle = `跟进客户: ${customer?.company || ""}`;
    } else if (data.leadId) {
      const lead = await prisma.lead.findUnique({ where: { id: data.leadId } });
      taskTitle = `跟进线索: ${lead?.company || ""}`;
    } else if (data.projectId) {
      const project = await prisma.project.findUnique({ where: { id: data.projectId } });
      taskTitle = `跟进项目: ${project?.name || ""}`;
    }

    await prisma.task.create({
      data: {
        title: taskTitle,
        type: "FOLLOW_UP",
        status: "PENDING",
        priority: "MEDIUM",
        dueDate: data.nextFollowUpDate,
        leadId: data.leadId,
        customerId: data.customerId,
        projectId: data.projectId,
      },
    });
  }

  revalidatePath("/follow-ups");
  if (data.leadId) revalidatePath(`/leads/${data.leadId}`);
  if (data.customerId) revalidatePath(`/customers/${data.customerId}`);
  if (data.projectId) revalidatePath(`/projects/${data.projectId}`);

  // 跳转到关联对象的详情页
  if (data.customerId) {
    redirect(`/customers/${data.customerId}`);
  } else if (data.leadId) {
    redirect(`/leads/${data.leadId}`);
  } else if (data.projectId) {
    redirect(`/projects/${data.projectId}`);
  } else {
    redirect("/follow-ups");
  }
}

export async function updateFollowUp(id: number, formData: FormData) {
  const data = {
    method: formData.get("method") as FollowUpMethod,
    content: formData.get("content") as string,
    customerFeedback: (formData.get("customerFeedback") as string) || null,
    nextAction: (formData.get("nextAction") as string) || null,
    followUpDate: formData.get("followUpDate")
      ? new Date(formData.get("followUpDate") as string)
      : new Date(),
    nextFollowUpDate: formData.get("nextFollowUpDate")
      ? new Date(formData.get("nextFollowUpDate") as string)
      : null,
    remark: (formData.get("remark") as string) || null,
    leadId: formData.get("leadId") ? parseInt(formData.get("leadId") as string) : null,
    customerId: formData.get("customerId") ? parseInt(formData.get("customerId") as string) : null,
    projectId: formData.get("projectId") ? parseInt(formData.get("projectId") as string) : null,
  };

  if (!data.content) throw new Error("跟进内容不能为空");

  await prisma.followUp.update({ where: { id }, data });
  revalidatePath("/follow-ups");
  redirect("/follow-ups");
}

export async function deleteFollowUp(id: number) {
  await prisma.followUp.delete({ where: { id } });
  revalidatePath("/follow-ups");
}
