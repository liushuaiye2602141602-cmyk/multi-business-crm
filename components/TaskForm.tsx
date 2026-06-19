"use client";

import Link from "next/link";
import { TaskTypeOptions, TaskStatusOptions, TaskPriorityOptions } from "@/lib/enums";

interface TaskFormProps {
  leads?: Array<{ id: number; company: string; contactName: string | null }>;
  customers?: Array<{ id: number; company: string }>;
  projects?: Array<{ id: number; name: string }>;
  task?: {
    id?: number;
    title: string;
    description: string | null;
    type: string;
    status: string;
    priority: string;
    dueDate: string;
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

export default function TaskForm({
  leads = [],
  customers = [],
  projects = [],
  task,
  defaultLeadId,
  defaultCustomerId,
  defaultProjectId,
  action,
  submitLabel,
}: TaskFormProps) {
  return (
    <form action={action} className="bg-white rounded-lg border p-6 space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4 text-gray-800">任务信息</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">任务标题 *</label>
            <input name="title" type="text" required defaultValue={task?.title}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="请输入任务标题" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">类型</label>
            <select name="type" defaultValue={task?.type || "FOLLOW_UP"}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
              {TaskTypeOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">状态</label>
            <select name="status" defaultValue={task?.status || "PENDING"}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
              {TaskStatusOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">优先级</label>
            <select name="priority" defaultValue={task?.priority || "MEDIUM"}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
              {TaskPriorityOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">截止日期 *</label>
            <input name="dueDate" type="date" required
              defaultValue={task?.dueDate || ""}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4 text-gray-800">关联对象</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">关联线索</label>
            <select name="leadId" defaultValue={task?.leadId || defaultLeadId || ""}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">无</option>
              {leads.map((l) => (
                <option key={l.id} value={l.id}>{l.company}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">关联客户</label>
            <select name="customerId" defaultValue={task?.customerId || defaultCustomerId || ""}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">无</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>{c.company}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">关联项目</label>
            <select name="projectId" defaultValue={task?.projectId || defaultProjectId || ""}
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
        <label className="block text-sm font-medium text-gray-700 mb-1">描述</label>
        <textarea name="description" rows={3} defaultValue={task?.description || ""}
          className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="请输入任务描述" />
      </div>

      <div className="flex gap-3 pt-4 border-t">
        <button type="submit"
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors">
          {submitLabel}
        </button>
        <Link href="/tasks"
          className="px-6 py-2 border rounded-lg hover:bg-gray-50 transition-colors">
          取消返回
        </Link>
      </div>
    </form>
  );
}
