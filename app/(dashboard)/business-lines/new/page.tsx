import Link from "next/link";
import { createBusinessLine } from "../actions";

export default function NewBusinessLinePage() {
  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">新增业务线</h1>
      <form action={createBusinessLine} className="bg-white rounded-lg border p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">名称 *</label>
          <input name="name" type="text" required
            className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="请输入业务线名称" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">代码</label>
          <input name="code" type="text"
            className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="如: FLEX, PACK, WOOD" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">描述</label>
          <textarea name="description" rows={3}
            className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="请输入业务线描述" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">网站</label>
          <input name="website" type="text"
            className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="https://..." />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">主要产品</label>
          <textarea name="mainProducts" rows={3}
            className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="该业务线的主要产品，用逗号分隔..." />
        </div>
        <div className="flex gap-3 pt-4 border-t">
          <button type="submit"
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors">
            创建
          </button>
          <Link href="/business-lines"
            className="px-6 py-2 border rounded-lg hover:bg-gray-50 transition-colors">
            取消返回
          </Link>
        </div>
      </form>
    </div>
  );
}
