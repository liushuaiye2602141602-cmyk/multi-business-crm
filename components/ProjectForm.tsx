"use client";

import { BusinessLine, Customer, Lead } from "@/lib/generated/prisma/client";
import Link from "next/link";
import { ProjectStatusOptions, CurrencyOptions } from "@/lib/enums";

interface ProjectFormProps {
  businessLines: BusinessLine[];
  customers: Customer[];
  leads?: Lead[];
  project?: {
    id?: number;
    name: string;
    description: string | null;
    status: string;
    productCategory: string | null;
    productName: string | null;
    specs: string | null;
    quantity: string | null;
    usage: string | null;
    targetMarket: string | null;
    specialRequirements: string | null;
    amount: number | null;
    currency: string;
    startDate: Date | null;
    endDate: Date | null;
    remark: string | null;
    businessLineId: number;
    customerId: number;
    leadId: number | null;
  };
  action: (formData: FormData) => void;
  submitLabel: string;
}

export default function ProjectForm({ businessLines, customers, leads = [], project, action, submitLabel }: ProjectFormProps) {
  return (
    <form action={action} className="bg-white rounded-lg border p-6 space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4 text-gray-800">基础信息</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">项目名称 *</label>
            <input name="name" type="text" required defaultValue={project?.name}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">客户 *</label>
            <select name="customerId" required defaultValue={project?.customerId || ""}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">请选择</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>{c.company}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">业务线 *</label>
            <select name="businessLineId" required defaultValue={project?.businessLineId || ""}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">请选择</option>
              {businessLines.map((bl) => (
                <option key={bl.id} value={bl.id}>{bl.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">关联线索</label>
            <select name="leadId" defaultValue={project?.leadId || ""}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">无</option>
              {leads.map((l) => (
                <option key={l.id} value={l.id}>{l.company}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">状态</label>
            <select name="status" defaultValue={project?.status || "REQUIREMENT_CONFIRMING"}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
              {ProjectStatusOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4 text-gray-800">产品需求</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">产品类别</label>
            <input name="productCategory" type="text" defaultValue={project?.productCategory || ""}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">产品名称</label>
            <input name="productName" type="text" defaultValue={project?.productName || ""}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">规格</label>
            <input name="specs" type="text" defaultValue={project?.specs || ""}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">数量</label>
            <input name="quantity" type="text" defaultValue={project?.quantity || ""}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">用途</label>
            <input name="usage" type="text" defaultValue={project?.usage || ""}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">目标市场</label>
            <input name="targetMarket" type="text" defaultValue={project?.targetMarket || ""}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">特殊要求</label>
          <textarea name="specialRequirements" rows={3} defaultValue={project?.specialRequirements || ""}
            className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4 text-gray-800">商业信息</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">预计金额</label>
            <input name="amount" type="number" step="0.01" defaultValue={project?.amount?.toString() || ""}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">币种</label>
            <select name="currency" defaultValue={project?.currency || "USD"}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
              {CurrencyOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">开始日期</label>
            <input name="startDate" type="date"
              defaultValue={project?.startDate ? new Date(project.startDate).toISOString().split("T")[0] : ""}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">结束日期</label>
            <input name="endDate" type="date"
              defaultValue={project?.endDate ? new Date(project.endDate).toISOString().split("T")[0] : ""}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">项目描述</label>
          <textarea name="description" rows={3} defaultValue={project?.description || ""}
            className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">备注</label>
          <textarea name="remark" rows={2} defaultValue={project?.remark || ""}
            className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
      </div>

      <div className="flex gap-3 pt-4 border-t">
        <button type="submit"
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors">
          {submitLabel}
        </button>
        <Link href="/projects"
          className="px-6 py-2 border rounded-lg hover:bg-gray-50 transition-colors">
          取消返回
        </Link>
      </div>
    </form>
  );
}
