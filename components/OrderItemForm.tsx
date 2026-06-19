"use client";

import Link from "next/link";
import FormField from "./ui/FormField";
import { Input, Textarea, Select } from "./ui/FormField";

interface OrderItemFormProps {
  orderId: number;
  products: Array<{ id: number; name: string }>;
  item?: {
    id?: number;
    productId: number | null;
    itemName: string;
    specification: string | null;
    quantity: number | null;
    unit: string | null;
    unitPrice: number | null;
    totalPrice: number | null;
    notes: string | null;
    sortOrder: number;
  };
  action: (formData: FormData) => void;
  submitLabel: string;
}

export default function OrderItemForm({
  orderId,
  products,
  item,
  action,
  submitLabel,
}: OrderItemFormProps) {
  return (
    <form action={action} className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-3 border-b border-gray-100">订单明细</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="产品" description="选择产品自动填入名称">
            <Select
              name="productId"
              options={products.map((p) => ({ value: String(p.id), label: p.name }))}
              placeholder="选择产品（可选）"
              defaultValue={item?.productId || ""}
            />
          </FormField>
          <FormField label="产品/项目名称" required>
            <Input name="itemName" type="text" defaultValue={item?.itemName || ""} required placeholder="产品或项目名称" />
          </FormField>
          <FormField label="规格">
            <Input name="specification" type="text" defaultValue={item?.specification || ""} placeholder="规格说明" />
          </FormField>
          <FormField label="数量">
            <Input name="quantity" type="number" step="0.01" defaultValue={item?.quantity?.toString() || ""} placeholder="0" />
          </FormField>
          <FormField label="单位">
            <Input name="unit" type="text" defaultValue={item?.unit || ""} placeholder="pcs, kg, sets" />
          </FormField>
          <FormField label="单价">
            <Input name="unitPrice" type="number" step="0.01" defaultValue={item?.unitPrice?.toString() || ""} placeholder="0.00" />
          </FormField>
          <FormField label="总价" description="数量×单价有值时自动计算">
            <Input name="totalPrice" type="number" step="0.01" defaultValue={item?.totalPrice?.toString() || ""} placeholder="0.00" />
          </FormField>
          <FormField label="排序">
            <Input name="sortOrder" type="number" defaultValue={item?.sortOrder?.toString() || "0"} placeholder="0" />
          </FormField>
        </div>
        <div className="mt-4">
          <FormField label="备注">
            <Textarea name="notes" rows={2} defaultValue={item?.notes || ""} placeholder="备注信息..." />
          </FormField>
        </div>
      </div>

      <div className="flex gap-3 pt-4 border-t border-gray-100">
        <button type="submit"
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium">
          {submitLabel}
        </button>
        <Link href={`/orders/${orderId}`}
          className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium">
          取消返回
        </Link>
      </div>
    </form>
  );
}
