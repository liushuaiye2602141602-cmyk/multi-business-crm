"use client";

import { Lead, Customer, Project } from "@/lib/generated/prisma/client";
import Link from "next/link";
import { FollowUpMethodOptions } from "@/lib/enums";

interface FollowUpFormProps {
  leads?: Lead[];
  customers?: Customer[];
  projects?: Project[];
  followUp?: {
    id?: number;
    method: string;
    content: string;
    customerFeedback: string | null;
    nextAction: string | null;
    followUpDate: Date;
    nextFollowUpDate: Date | null;
    remark: string | null;
    leadId: number | null;
    customerId: number | null;
    projectId: number | null;
  };
  defaultLeadId?: number;
  defaultCustomerId?: number;
  defaultProjectId?: number;
  action: (formData: FormData) => void;
  submitLabel: string;
}

export default function FollowUpForm({
  leads = [],
  customers = [],
  projects = [],
  followUp,
  defaultLeadId,
  defaultCustomerId,
  defaultProjectId,
  action,
  submitLabel,
}: FollowUpFormProps) {
  return (
    <form action={action} className="bg-white rounded-lg border p-6 space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4 text-gray-800">关联对象</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">关联线索</label>
            <select name="leadId" defaultValue={followUp?.leadId || defaultLeadId || ""}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">无</option>
              {leads.map((l) => (
                <option key={l.id} value={l.id}>{l.company} - {l.contactName}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">关联客户</label>
            <select name="customerId" defaultValue={followUp?.customerId || defaultCustomerId || ""}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">无</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>{c.company}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">关联项目</label>
            <select name="projectId" defaultValue={followUp?.projectId || defaultProjectId || ""}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">无</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4 text-gray-800">跟进详情</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">跟进方式 *</label>
            <select name="method" required defaultValue={followUp?.method || "EMAIL"}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
              {FollowUpMethodOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">跟进日期</label>
            <input name="followUpDate" type="date"
              defaultValue={followUp?.followUpDate
                ? new Date(followUp.followUpDate).toISOString().split("T")[0]
                : new Date().toISOString().split("T")[0]}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">跟进内容 *</label>
          <textarea name="content" rows={4} required defaultValue={followUp?.content || ""}
            className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="本次跟进的具体内容..." />
        </div>
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">客户反馈</label>
          <textarea name="customerFeedback" rows={3} defaultValue={followUp?.customerFeedback || ""}
            className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="客户的反馈意见..." />
        </div>
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">下一步动作</label>
          <textarea name="nextAction" rows={2} defaultValue={followUp?.nextAction || ""}
            className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="下一步需要做什么..." />
        </div>
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">下次跟进日期</label>
          <input name="nextFollowUpDate" type="date"
            defaultValue={followUp?.nextFollowUpDate
              ? new Date(followUp.nextFollowUpDate).toISOString().split("T")[0]
              : ""}
            className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <p className="text-xs text-gray-500 mt-1">填写后将自动创建跟进任务</p>
        </div>
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">备注</label>
          <textarea name="remark" rows={2} defaultValue={followUp?.remark || ""}
            className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
      </div>

      <div className="flex gap-3 pt-4 border-t">
        <button type="submit"
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors">
          {submitLabel}
        </button>
        <Link href="/follow-ups"
          className="px-6 py-2 border rounded-lg hover:bg-gray-50 transition-colors">
          取消返回
        </Link>
      </div>
    </form>
  );
}
