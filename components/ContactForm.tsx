"use client";

import { Customer } from "@/lib/generated/prisma/client";
import Link from "next/link";
import FormField from "./ui/FormField";
import { Input, Textarea, Select } from "./ui/FormField";

interface ContactFormProps {
  customers: Customer[];
  contact?: {
    id?: number;
    customerId: number;
    name: string;
    position: string | null;
    email: string | null;
    whatsapp: string | null;
    phone: string | null;
    wechat: string | null;
    linkedin: string | null;
    isPrimary: boolean;
    notes: string | null;
  };
  defaultCustomerId?: number;
  action: (formData: FormData) => void;
  submitLabel: string;
}

export default function ContactForm({
  customers,
  contact,
  defaultCustomerId,
  action,
  submitLabel,
}: ContactFormProps) {
  return (
    <form action={action} className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-3 border-b border-gray-100">联系人信息</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="客户" required>
            <Select
              name="customerId"
              options={customers.map((c) => ({ value: String(c.id), label: c.company }))}
              placeholder="请选择客户"
              defaultValue={contact?.customerId || defaultCustomerId || ""}
              required
            />
          </FormField>
          <FormField label="姓名" required>
            <Input name="name" type="text" defaultValue={contact?.name || ""} required placeholder="请输入联系人姓名" />
          </FormField>
          <FormField label="职位">
            <Input name="position" type="text" defaultValue={contact?.position || ""} placeholder="如: Purchasing Manager" />
          </FormField>
          <FormField label="邮箱">
            <Input name="email" type="email" defaultValue={contact?.email || ""} placeholder="email@example.com" />
          </FormField>
          <FormField label="WhatsApp">
            <Input name="whatsapp" type="text" defaultValue={contact?.whatsapp || ""} placeholder="+1 234567890" />
          </FormField>
          <FormField label="电话">
            <Input name="phone" type="text" defaultValue={contact?.phone || ""} placeholder="+1 234567890" />
          </FormField>
          <FormField label="微信">
            <Input name="wechat" type="text" defaultValue={contact?.wechat || ""} placeholder="微信号" />
          </FormField>
          <FormField label="LinkedIn">
            <Input name="linkedin" type="text" defaultValue={contact?.linkedin || ""} placeholder="LinkedIn profile URL" />
          </FormField>
          <div className="flex items-center gap-2 mt-6">
            <input name="isPrimary" type="checkbox" defaultChecked={contact?.isPrimary ?? false}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
            <label className="text-sm font-medium text-gray-700">设为主联系人</label>
          </div>
        </div>
        <div className="mt-4">
          <FormField label="备注">
            <Textarea name="notes" rows={3} defaultValue={contact?.notes || ""} placeholder="备注信息..." />
          </FormField>
        </div>
      </div>

      <div className="flex gap-3 pt-4 border-t border-gray-100">
        <button type="submit"
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium">
          {submitLabel}
        </button>
        <Link href="/contacts"
          className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium">
          取消返回
        </Link>
      </div>
    </form>
  );
}
