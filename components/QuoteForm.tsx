"use client";

import { Lead, Customer, Project } from "@/lib/generated/prisma/client";
import Link from "next/link";
import { QuoteStatusOptions, CurrencyOptions } from "@/lib/enums";
import { generateQuoteNo } from "@/lib/format";

interface QuoteFormProps {
  leads?: Lead[];
  customers?: Customer[];
  projects?: Project[];
  quote?: {
    id?: number;
    quoteNo: string;
    productName: string | null;
    specs: string | null;
    quantity: string | null;
    unitPrice: number | null;
    totalPrice: number | null;
    currency: string;
    paymentTerms: string | null;
    deliveryTime: string | null;
    validUntil: Date | null;
    content: string | null;
    status: string;
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

export default function QuoteForm({
  leads = [],
  customers = [],
  projects = [],
  quote,
  defaultLeadId,
  defaultCustomerId,
  defaultProjectId,
  action,
  submitLabel,
}: QuoteFormProps) {
  return (
    <form action={action} className="bg-white rounded-lg border p-6 space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4 text-gray-800">报价基础</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">报价编号 *</label>
            <input name="quoteNo" type="text" required
              defaultValue={quote?.quoteNo || generateQuoteNo()}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">状态</label>
            <select name="status" defaultValue={quote?.status || "DRAFT"}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
              {QuoteStatusOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">关联客户</label>
            <select name="customerId" defaultValue={quote?.customerId || defaultCustomerId || ""}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">无</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>{c.company}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">关联项目</label>
            <select name="projectId" defaultValue={quote?.projectId || defaultProjectId || ""}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">无</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">关联线索</label>
            <select name="leadId" defaultValue={quote?.leadId || defaultLeadId || ""}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">无</option>
              {leads.map((l) => (
                <option key={l.id} value={l.id}>{l.company}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4 text-gray-800">产品信息</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">产品名称</label>
            <input name="productName" type="text" defaultValue={quote?.productName || ""}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">规格</label>
            <input name="specs" type="text" defaultValue={quote?.specs || ""}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">数量</label>
            <input name="quantity" type="text" defaultValue={quote?.quantity || ""}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="如: 10000 pcs 或 10 tons" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">币种</label>
            <select name="currency" defaultValue={quote?.currency || "USD"}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
              {CurrencyOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">单价</label>
            <input name="unitPrice" type="number" step="0.01"
              defaultValue={quote?.unitPrice?.toString() || ""}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">总价</label>
            <input name="totalPrice" type="number" step="0.01"
              defaultValue={quote?.totalPrice?.toString() || ""}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="数量为纯数字时自动计算" />
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4 text-gray-800">商务条款</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">付款方式</label>
            <input name="paymentTerms" type="text" defaultValue={quote?.paymentTerms || ""}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="如: T/T, L/C, Western Union" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">交期</label>
            <input name="deliveryTime" type="text" defaultValue={quote?.deliveryTime || ""}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="如: 30 days after deposit" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">有效期</label>
            <input name="validUntil" type="date"
              defaultValue={quote?.validUntil
                ? new Date(quote.validUntil).toISOString().split("T")[0]
                : ""}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">报价详情</label>
          <textarea name="content" rows={4} defaultValue={quote?.content || ""}
            className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="报价的详细说明..." />
        </div>
      </div>

      <div className="flex gap-3 pt-4 border-t">
        <button type="submit"
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors">
          {submitLabel}
        </button>
        <Link href="/quotes"
          className="px-6 py-2 border rounded-lg hover:bg-gray-50 transition-colors">
          取消返回
        </Link>
      </div>
    </form>
  );
}
