"use client";

import Link from "next/link";
import { OrderStatusOptions, CurrencyOptions } from "@/lib/enums";
import FormField from "./ui/FormField";
import { Input, Textarea, Select } from "./ui/FormField";

interface OrderFormProps {
  customers: Array<{ id: number; company: string }>;
  projects: Array<{ id: number; name: string }>;
  quotes: Array<{ id: number; quoteNo: string }>;
  contacts: Array<{ id: number; name: string }>;
  businessLines: Array<{ id: number; name: string }>;
  order?: {
    id?: number;
    orderNo?: string;
    orderTitle: string | null;
    customerId: number;
    projectId: number | null;
    quoteId: number | null;
    contactId: number | null;
    businessLineId: number | null;
    orderStatus: string;
    totalAmount: number | null;
    currency: string;
    paymentTerm: string | null;
    deliveryTerm: string | null;
    expectedDeliveryDate: Date | null;
    notes: string | null;
  };
  defaultCustomerId?: number;
  defaultQuoteId?: number;
  action: (formData: FormData) => void;
  submitLabel: string;
}

export default function OrderForm({
  customers,
  projects,
  quotes,
  contacts,
  businessLines,
  order,
  defaultCustomerId,
  defaultQuoteId,
  action,
  submitLabel,
}: OrderFormProps) {
  return (
    <form action={action} className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-3 border-b border-gray-100">订单基础信息</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="订单编号" description="留空自动生成">
            <Input name="orderNo" type="text" defaultValue={order?.orderNo || ""} placeholder="O-YYYYMMDD-XXXX" />
          </FormField>
          <FormField label="订单标题">
            <Input name="orderTitle" type="text" defaultValue={order?.orderTitle || ""} placeholder="订单标题" />
          </FormField>
          <FormField label="客户" required>
            <Select
              name="customerId"
              options={customers.map((c) => ({ value: String(c.id), label: c.company }))}
              placeholder="请选择客户"
              defaultValue={order?.customerId || defaultCustomerId || ""}
              required
            />
          </FormField>
          <FormField label="项目">
            <Select
              name="projectId"
              options={projects.map((p) => ({ value: String(p.id), label: p.name }))}
              placeholder="请选择项目"
              defaultValue={order?.projectId || ""}
            />
          </FormField>
          <FormField label="关联报价">
            <Select
              name="quoteId"
              options={quotes.map((q) => ({ value: String(q.id), label: q.quoteNo }))}
              placeholder="请选择报价"
              defaultValue={order?.quoteId || defaultQuoteId || ""}
            />
          </FormField>
          <FormField label="联系人">
            <Select
              name="contactId"
              options={contacts.map((c) => ({ value: String(c.id), label: c.name }))}
              placeholder="请选择联系人"
              defaultValue={order?.contactId || ""}
            />
          </FormField>
          <FormField label="业务线">
            <Select
              name="businessLineId"
              options={businessLines.map((bl) => ({ value: String(bl.id), label: bl.name }))}
              placeholder="请选择业务线"
              defaultValue={order?.businessLineId || ""}
            />
          </FormField>
          <FormField label="订单状态">
            <Select
              name="orderStatus"
              options={OrderStatusOptions}
              defaultValue={order?.orderStatus || "DRAFT"}
            />
          </FormField>
          <FormField label="币种">
            <Select
              name="currency"
              options={CurrencyOptions}
              defaultValue={order?.currency || "USD"}
            />
          </FormField>
          <FormField label="总金额">
            <Input name="totalAmount" type="number" step="0.01" defaultValue={order?.totalAmount?.toString() || ""} placeholder="0.00" />
          </FormField>
          <FormField label="付款方式">
            <Input name="paymentTerm" type="text" defaultValue={order?.paymentTerm || ""} placeholder="如: T/T 30% deposit, 70% before shipment" />
          </FormField>
          <FormField label="交货条款">
            <Input name="deliveryTerm" type="text" defaultValue={order?.deliveryTerm || ""} placeholder="如: FOB Shanghai" />
          </FormField>
          <FormField label="预计交期">
            <Input name="expectedDeliveryDate" type="date" defaultValue={order?.expectedDeliveryDate ? new Date(order.expectedDeliveryDate).toISOString().split("T")[0] : ""} />
          </FormField>
        </div>
        <div className="mt-4">
          <FormField label="备注">
            <Textarea name="notes" rows={3} defaultValue={order?.notes || ""} placeholder="备注信息..." />
          </FormField>
        </div>
      </div>

      <div className="flex gap-3 pt-4 border-t border-gray-100">
        <button type="submit"
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium">
          {submitLabel}
        </button>
        <Link href="/orders"
          className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium">
          取消返回
        </Link>
      </div>
    </form>
  );
}
