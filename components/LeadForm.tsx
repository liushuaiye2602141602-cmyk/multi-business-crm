"use client";

import Link from "next/link";
import {
  LeadSourceOptions,
  LeadStatusOptions,
  LeadTemperatureOptions,
  LeadGradeOptions,
  CurrencyOptions,
} from "@/lib/enums";

interface LeadFormProps {
  businessLines: Array<{ id: number; name: string }>;
  lead?: {
    id?: number;
    company: string;
    contactName: string;
    country: string | null;
    phone: string | null;
    email: string | null;
    whatsapp: string | null;
    source: string;
    sourceWebsite: string | null;
    status: string;
    temperature: string;
    grade: string;
    requirement: string | null;
    interestProducts: string | null;
    inquiryContent: string | null;
    budget: number | null;
    currency: string;
    expectedClosing: Date | null;
    nextFollowUp: Date | null;
    remark: string | null;
    businessLineId: number;
  };
  action: (formData: FormData) => void;
  submitLabel: string;
}

export default function LeadForm({ businessLines, lead, action, submitLabel }: LeadFormProps) {
  return (
    <form action={action} className="bg-white rounded-lg border p-6 space-y-6">
      {/* 基础信息 */}
      <div>
        <h3 className="text-lg font-semibold mb-4 text-gray-800">基础信息</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">公司名称 *</label>
            <input name="company" type="text" required defaultValue={lead?.company}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">联系人 *</label>
            <input name="contactName" type="text" required defaultValue={lead?.contactName}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">国家</label>
            <input name="country" type="text" defaultValue={lead?.country || ""}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">电话</label>
            <input name="phone" type="text" defaultValue={lead?.phone || ""}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">邮箱</label>
            <input name="email" type="email" defaultValue={lead?.email || ""}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp</label>
            <input name="whatsapp" type="text" defaultValue={lead?.whatsapp || ""}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">业务线 *</label>
            <select name="businessLineId" required defaultValue={lead?.businessLineId || ""}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">请选择</option>
              {businessLines.map((bl) => (
                <option key={bl.id} value={bl.id}>{bl.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">来源渠道 *</label>
            <select name="source" required defaultValue={lead?.source || "MANUAL_OUTREACH"}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
              {LeadSourceOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">来源网站</label>
            <input name="sourceWebsite" type="text" defaultValue={lead?.sourceWebsite || ""}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="https://..." />
          </div>
        </div>
      </div>

      {/* 需求信息 */}
      <div>
        <h3 className="text-lg font-semibold mb-4 text-gray-800">需求信息</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">状态</label>
            <select name="status" defaultValue={lead?.status || "NEW"}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
              {LeadStatusOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">意向度</label>
            <select name="temperature" defaultValue={lead?.temperature || "WARM"}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
              {LeadTemperatureOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">客户等级</label>
            <select name="grade" defaultValue={lead?.grade || "C"}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
              {LeadGradeOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">币种</label>
            <select name="currency" defaultValue={lead?.currency || "USD"}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
              {CurrencyOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">预算金额</label>
            <input name="budget" type="number" step="0.01" defaultValue={lead?.budget?.toString() || ""}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">预计成交日期</label>
            <input name="expectedClosing" type="date"
              defaultValue={lead?.expectedClosing ? new Date(lead.expectedClosing).toISOString().split("T")[0] : ""}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">下次跟进日期</label>
            <input name="nextFollowUp" type="date"
              defaultValue={lead?.nextFollowUp ? new Date(lead.nextFollowUp).toISOString().split("T")[0] : ""}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">感兴趣产品</label>
          <textarea name="interestProducts" rows={2} defaultValue={lead?.interestProducts || ""}
            className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="客户感兴趣的产品..." />
        </div>
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">询盘内容</label>
          <textarea name="inquiryContent" rows={3} defaultValue={lead?.inquiryContent || ""}
            className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="客户的询盘内容..." />
        </div>
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">需求描述</label>
          <textarea name="requirement" rows={3} defaultValue={lead?.requirement || ""}
            className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">备注</label>
          <textarea name="remark" rows={2} defaultValue={lead?.remark || ""}
            className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
      </div>

      <div className="flex gap-3 pt-4 border-t">
        <button type="submit"
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors">
          {submitLabel}
        </button>
        <Link href="/leads"
          className="px-6 py-2 border rounded-lg hover:bg-gray-50 transition-colors">
          取消返回
        </Link>
      </div>
    </form>
  );
}
