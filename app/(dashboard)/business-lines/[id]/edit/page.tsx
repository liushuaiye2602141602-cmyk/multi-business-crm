import Link from "next/link";
export const dynamic = "force-dynamic";
import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import { updateBusinessLine } from "../../actions";

export default async function EditBusinessLinePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const businessLine = await prisma.businessLine.findUnique({
    where: { id: parseInt(id) },
  });

  if (!businessLine) return notFound();

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">编辑业务线</h1>
      <form
        action={async (formData: FormData) => {
          "use server";
          await updateBusinessLine(businessLine.id, formData);
        }}
        className="bg-white rounded-lg border p-6 space-y-4"
      >
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">名称 *</label>
          <input name="name" type="text" required defaultValue={businessLine.name}
            className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">代码</label>
          <input name="code" type="text" defaultValue={businessLine.code || ""}
            className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">描述</label>
          <textarea name="description" rows={3} defaultValue={businessLine.description || ""}
            className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">网站</label>
          <input name="website" type="text" defaultValue={businessLine.website || ""}
            className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">主要产品</label>
          <textarea name="mainProducts" rows={3} defaultValue={businessLine.mainProducts || ""}
            className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div className="flex gap-3 pt-4 border-t">
          <button type="submit"
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors">
            保存
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
