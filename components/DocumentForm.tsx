"use client";

import Link from "next/link";
import { DocumentTypeOptions, DocumentRelatedTypeOptions } from "@/lib/enums";
import FormField from "./ui/FormField";
import { Input, Textarea, Select } from "./ui/FormField";

interface DocumentFormProps {
  document?: {
    id?: number;
    title: string;
    documentType: string;
    fileUrl: string | null;
    fileName: string | null;
    notes: string | null;
    relatedType: string;
    relatedId: number;
  };
  defaultRelatedType?: string;
  defaultRelatedId?: number;
  action: (formData: FormData) => void;
  submitLabel: string;
}

export default function DocumentForm({
  document,
  defaultRelatedType,
  defaultRelatedId,
  action,
  submitLabel,
}: DocumentFormProps) {
  return (
    <form action={action} className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-3 border-b border-gray-100">文档信息</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="文档标题" required>
            <Input name="title" type="text" defaultValue={document?.title || ""} required placeholder="请输入文档标题" />
          </FormField>
          <FormField label="文档类型" required>
            <Select
              name="documentType"
              options={DocumentTypeOptions}
              placeholder="请选择文档类型"
              defaultValue={document?.documentType || ""}
              required
            />
          </FormField>
          <FormField label="关联类型" required>
            <Select
              name="relatedType"
              options={DocumentRelatedTypeOptions}
              placeholder="请选择关联类型"
              defaultValue={document?.relatedType || defaultRelatedType || ""}
              required
            />
          </FormField>
          <FormField label="关联 ID" required>
            <Input name="relatedId" type="number" defaultValue={document?.relatedId || defaultRelatedId || ""} required placeholder="关联对象 ID" />
          </FormField>
          <FormField label="文件链接">
            <Input name="fileUrl" type="text" defaultValue={document?.fileUrl || ""} placeholder="https://..." />
          </FormField>
          <FormField label="文件名">
            <Input name="fileName" type="text" defaultValue={document?.fileName || ""} placeholder="文件名" />
          </FormField>
        </div>
        <div className="mt-4">
          <FormField label="备注">
            <Textarea name="notes" rows={3} defaultValue={document?.notes || ""} placeholder="备注信息..." />
          </FormField>
        </div>
      </div>

      <div className="flex gap-3 pt-4 border-t border-gray-100">
        <button type="submit"
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium">
          {submitLabel}
        </button>
        <Link href="/documents"
          className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium">
          取消返回
        </Link>
      </div>
    </form>
  );
}
