"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createActivityLog } from "@/lib/activity-log";

export async function createContact(formData: FormData) {
  const data = {
    name: formData.get("name") as string,
    customerId: parseInt(formData.get("customerId") as string),
    position: (formData.get("position") as string) || null,
    email: (formData.get("email") as string) || null,
    whatsapp: (formData.get("whatsapp") as string) || null,
    phone: (formData.get("phone") as string) || null,
    wechat: (formData.get("wechat") as string) || null,
    linkedin: (formData.get("linkedin") as string) || null,
    isPrimary: formData.get("isPrimary") === "on",
    notes: (formData.get("notes") as string) || null,
  };

  if (!data.name) throw new Error("联系人姓名不能为空");

  const contact = await prisma.contact.create({ data });

  await createActivityLog({
    action: "创建",
    entityType: "联系人",
    entityId: contact.id,
    entityName: contact.name,
    description: `创建联系人: ${contact.name}`,
  });

  revalidatePath("/contacts");
  revalidatePath(`/customers/${data.customerId}`);
  redirect(`/contacts/${contact.id}`);
}

export async function updateContact(id: number, formData: FormData) {
  const data = {
    name: formData.get("name") as string,
    position: (formData.get("position") as string) || null,
    email: (formData.get("email") as string) || null,
    whatsapp: (formData.get("whatsapp") as string) || null,
    phone: (formData.get("phone") as string) || null,
    wechat: (formData.get("wechat") as string) || null,
    linkedin: (formData.get("linkedin") as string) || null,
    isPrimary: formData.get("isPrimary") === "on",
    notes: (formData.get("notes") as string) || null,
  };

  if (!data.name) throw new Error("联系人姓名不能为空");

  const contact = await prisma.contact.update({ where: { id }, data });

  await createActivityLog({
    action: "更新",
    entityType: "联系人",
    entityId: id,
    entityName: contact.name,
    description: `更新联系人: ${contact.name}`,
  });

  revalidatePath("/contacts");
  revalidatePath(`/contacts/${id}`);
  redirect(`/contacts/${id}`);
}

export async function deleteContact(id: number) {
  const contact = await prisma.contact.findUnique({ where: { id } });
  if (!contact) throw new Error("联系人不存在");

  await prisma.contact.delete({ where: { id } });

  await createActivityLog({
    action: "删除",
    entityType: "联系人",
    entityId: id,
    entityName: contact.name,
    description: `删除联系人: ${contact.name}`,
  });

  revalidatePath("/contacts");
  revalidatePath(`/customers/${contact.customerId}`);
}
