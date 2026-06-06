"use client";

import { BusinessLine } from "@/lib/generated/prisma/client";
import Link from "next/link";

interface ProductFormProps {
  businessLines: BusinessLine[];
  product?: {
    id?: number;
    name: string;
    category: string | null;
    englishKeywords: string | null;
    commonSpecs: string | null;
    application: string | null;
    targetMarket: string | null;
    notes: string | null;
    isActive: boolean;
    businessLineId: number;
  };
  action: (formData: FormData) => void;
  submitLabel: string;
}

export default function ProductForm({ businessLines, product, action, submitLabel }: ProductFormProps) {
  return (
    <form action={action} className="bg-white rounded-lg border p-6 space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4 text-gray-800">产品信息</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">产品名称 *</label>
            <input name="name" type="text" required defaultValue={product?.name}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="如: Stand Up Pouch" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">业务线 *</label>
            <select name="businessLineId" required defaultValue={product?.businessLineId || ""}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">请选择</option>
              {businessLines.map((bl) => (
                <option key={bl.id} value={bl.id}>{bl.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">分类</label>
            <input name="category" type="text" defaultValue={product?.category || ""}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="如: Pouch, Bag, Machine" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">英文关键词</label>
            <input name="englishKeywords" type="text" defaultValue={product?.englishKeywords || ""}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="逗号分隔，如: stand up pouch, doypack" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">常见规格</label>
            <input name="commonSpecs" type="text" defaultValue={product?.commonSpecs || ""}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="如: 100g, 250g, 500g, 1kg" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">用途</label>
            <input name="application" type="text" defaultValue={product?.application || ""}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="如: Food, Beverage, Pet Food" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">目标市场</label>
            <input name="targetMarket" type="text" defaultValue={product?.targetMarket || ""}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="如: Europe, North America, Southeast Asia" />
          </div>
          <div className="flex items-center gap-2 mt-6">
            <input name="isActive" type="checkbox" defaultChecked={product?.isActive ?? true}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
            <label className="text-sm font-medium text-gray-700">启用</label>
          </div>
        </div>
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">备注</label>
          <textarea name="notes" rows={3} defaultValue={product?.notes || ""}
            className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="其他说明..." />
        </div>
      </div>

      <div className="flex gap-3 pt-4 border-t">
        <button type="submit"
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors">
          {submitLabel}
        </button>
        <Link href="/products"
          className="px-6 py-2 border rounded-lg hover:bg-gray-50 transition-colors">
          取消返回
        </Link>
      </div>
    </form>
  );
}
