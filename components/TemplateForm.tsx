"use client";

import { BusinessLine } from "@/lib/generated/prisma/client";
import Link from "next/link";
import { TemplateSceneOptions, TemplateLanguageOptions } from "@/lib/enums";

interface TemplateFormProps {
  businessLines: BusinessLine[];
  template?: {
    id?: number;
    title: string;
    scene: string;
    subject: string | null;
    content: string;
    language: string;
    notes: string | null;
    businessLineId: number | null;
    isActive: boolean;
  };
  action: (formData: FormData) => void;
  submitLabel: string;
}

export default function TemplateForm({ businessLines, template, action, submitLabel }: TemplateFormProps) {
  return (
    <form action={action} className="bg-white rounded-lg border p-6 space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4 text-gray-800">模板信息</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">模板标题 *</label>
            <input name="title" type="text" required defaultValue={template?.title}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="如: First Reply to Inquiry" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">场景 *</label>
            <select name="scene" required defaultValue={template?.scene || ""}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">请选择</option>
              {TemplateSceneOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">语言</label>
            <select name="language" defaultValue={template?.language || "EN"}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
              {TemplateLanguageOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">业务线</label>
            <select name="businessLineId" defaultValue={template?.businessLineId || ""}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">通用（不限业务线）</option>
              {businessLines.map((bl) => (
                <option key={bl.id} value={bl.id}>{bl.name}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2 mt-6">
            <input name="isActive" type="checkbox" defaultChecked={template?.isActive ?? true}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
            <label className="text-sm font-medium text-gray-700">启用</label>
          </div>
        </div>
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">邮件主题</label>
          <input name="subject" type="text" defaultValue={template?.subject || ""}
            className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="如: Re: Your Inquiry" />
        </div>
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">模板内容 *</label>
          <textarea name="content" rows={12} required defaultValue={template?.content || ""}
            className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
            placeholder="请输入模板内容..." />
        </div>
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">备注</label>
          <textarea name="notes" rows={2} defaultValue={template?.notes || ""}
            className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="使用说明..." />
        </div>
      </div>

      <div className="flex gap-3 pt-4 border-t">
        <button type="submit"
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors">
          {submitLabel}
        </button>
        <Link href="/templates"
          className="px-6 py-2 border rounded-lg hover:bg-gray-50 transition-colors">
          取消返回
        </Link>
      </div>
    </form>
  );
}
