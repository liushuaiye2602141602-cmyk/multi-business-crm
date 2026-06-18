import prisma from "@/lib/prisma";

interface FollowUpAction {
  type: "task_created" | "message_sent" | "reminder_set";
  entityId: number;
  entityType: string;
  message: string;
}

export async function checkAndTriggerFollowUps(): Promise<FollowUpAction[]> {
  const actions: FollowUpAction[] = [];
  const now = new Date();

  // 1. Leads with no follow-up in 3 days
  const staleLeads = await prisma.lead.findMany({
    where: {
      status: { in: ["NEW", "CONTACTED"] },
      followUps: {
        none: {
          followUpDate: { gte: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000) },
        },
      },
    },
    take: 10,
  });

  for (const lead of staleLeads) {
    // Check if a task already exists
    const existingTask = await prisma.task.findFirst({
      where: {
        leadId: lead.id,
        title: { contains: "AI 自动跟进" },
        status: "PENDING",
      },
    });

    if (!existingTask) {
      await prisma.task.create({
        data: {
          title: `AI 自动跟进: ${lead.company}`,
          description: `线索 ${lead.company} 已 3 天未跟进，建议联系`,
          type: "FOLLOW_UP",
          status: "PENDING",
          priority: "MEDIUM",
          dueDate: now,
          leadId: lead.id,
        },
      });

      actions.push({
        type: "task_created",
        entityId: lead.id,
        entityType: "Lead",
        message: `为 ${lead.company} 创建了自动跟进任务`,
      });
    }
  }

  // 2. Customers inactive for 7 days
  const inactiveCustomers = await prisma.customer.findMany({
    where: {
      customerStatus: "ACTIVE",
      followUps: {
        none: {
          followUpDate: { gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) },
        },
      },
    },
    take: 10,
  });

  for (const customer of inactiveCustomers) {
    const existingTask = await prisma.task.findFirst({
      where: {
        customerId: customer.id,
        title: { contains: "AI 客户回访" },
        status: "PENDING",
      },
    });

    if (!existingTask) {
      await prisma.task.create({
        data: {
          title: `AI 客户回访: ${customer.company}`,
          description: `客户 ${customer.company} 已 7 天未联系，建议回访`,
          type: "FOLLOW_UP",
          status: "PENDING",
          priority: "HIGH",
          dueDate: now,
          customerId: customer.id,
        },
      });

      actions.push({
        type: "task_created",
        entityId: customer.id,
        entityType: "Customer",
        message: `为 ${customer.company} 创建了回访任务`,
      });
    }
  }

  return actions;
}
