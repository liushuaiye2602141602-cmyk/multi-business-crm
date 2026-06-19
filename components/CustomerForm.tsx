"use client";

import Link from "next/link";
import {
  CustomerTypeOptions,
  CustomerStatusOptions,
  LeadGradeOptions,
  LeadSourceOptions,
} from "@/lib/enums";

interface CustomerFormProps {
  businessLines: Array<{ id: number; name: string }>;
  customer?: {
    id?: number;
    company: string;
    contactName: string;
    country: string | null;
    phone: string | null;
    email: string | null;
    whatsapp: string | null;
    website: string | null;
    address: string | null;
    industry: string | null;
    customerType: string;
    customerStatus: string;
    leadGrade: string;
    source: string | null;
    sourceWebsite: string | null;
    remark: string | null;
    businessLineId: number;
  };
  action: (formData: FormData) => void;
  submitLabel: string;
}

export default function CustomerForm({ businessLines, customer, action, submitLabel }: CustomerFormProps) {
  return (
    <form action={action} className="bg-white rounded-lg border p-6 space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4 text-gray-800">基础信息</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">公司名称 *</label>
            <input name="company" type="text" required defaultValue={customer?.company}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">联系人 *</label>
            <input name="contactName" type="text" required defaultValue={customer?.contactName}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">国家</label>
            <input name="country" type="text" defaultValue={customer?.country || ""}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">电话</label>
            <input name="phone" type="text" defaultValue={customer?.phone || ""}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">邮箱</label>
            <input name="email" type="email" defaultValue={customer?.email || ""}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp</label>
            <input name="whatsapp" type="text" defaultValue={customer?.whatsapp || ""}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">网站</label>
            <input name="website" type="text" defaultValue={customer?.website || ""}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="https://..." />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">行业</label>
            <input name="industry" type="text" defaultValue={customer?.industry || ""}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">业务线 *</label>
            <select name="businessLineId" required defaultValue={customer?.businessLineId || ""}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">请选择</option>
              {businessLines.map((bl) => (
                <option key={bl.id} value={bl.id}>{bl.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">客户类型</label>
            <select name="customerType" defaultValue={customer?.customerType || "UNKNOWN"}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
              {CustomerTypeOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">客户状态</label>
            <select name="customerStatus" defaultValue={customer?.customerStatus || "POTENTIAL"}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
              {CustomerStatusOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">客户等级</label>
            <select name="leadGrade" defaultValue={customer?.leadGrade || "C"}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
              {LeadGradeOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">来源渠道</label>
            <select name="source" defaultValue={customer?.source || ""}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">未知</option>
              {LeadSourceOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">来源网站</label>
            <input name="sourceWebsite" type="text" defaultValue={customer?.sourceWebsite || ""}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">地址</label>
          <input name="address" type="text" defaultValue={customer?.address || ""}
            className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">备注</label>
          <textarea name="remark" rows={3} defaultValue={customer?.remark || ""}
            className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
      </div>

      <div className="flex gap-3 pt-4 border-t">
        <button type="submit"
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors">
          {submitLabel}
        </button>
        <Link href="/customers"
          className="px-6 py-2 border rounded-lg hover:bg-gray-50 transition-colors">
          取消返回
        </Link>
      </div>
    </form>
  );
}
