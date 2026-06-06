"use server";

import prisma from "./prisma";

export async function createActivityLog({
  action,
  entityType,
  entityId,
  entityName,
  description,
}: {
  action: string;
  entityType: string;
  entityId?: string | number;
  entityName?: string;
  description?: string;
}) {
  try {
    await prisma.activityLog.create({
      data: {
        action,
        entityType,
        entityId: entityId ? String(entityId) : null,
        entityName: entityName || null,
        description: description || null,
      },
    });
  } catch (error) {
    // 日志记录失败不应阻断主流程
    console.error("Failed to create activity log:", error);
  }
}
