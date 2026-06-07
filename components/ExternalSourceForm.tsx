"use client";

import { BusinessLine } from "@/lib/generated/prisma/client";
import Link from "next/link";
import { ExternalSourceTypeOptions, LeadSourceOptions, LeadGradeOptions, TaskPriorityOptions } from "@/lib/enums";

interface ExternalSourceFormProps {
  businessLines: BusinessLine[];
  source?: {
    id?: number;
    name: string;
    code: string;
    sourceType: string;
    businessLineId: number | null;
    defaultSource: string;
    defaultLeadGrade: string;
    defaultPriority: string;
    autoAnalyze: boolean;
    notes: string | null;
  };
  action: (formData: FormData) => void;
  submitLabel: string;
}

export default function ExternalSourceForm({ businessLines, source, action, submitLabel }: ExternalSourceFormProps) {
  return (
    <form action={action} className="bg-white rounded-lg border p-6 space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4 text-gray-800">基础信息</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">名称 *</label>
            <input name="name" type="text" required defaultValue={source?.name}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="如: 软包装官网表单" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">代码 *</label>
            <input name="code" type="text" required defaultValue={source?.code}
              disabled={!!source?.id}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
              placeholder="如: flexible-packaging-website" />
            {source?.id && <p className="text-xs text-gray-500 mt-1">代码不可修改</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">来源类型 *</label>
            <select name="sourceType" required defaultValue={source?.sourceType || ""}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">请选择</option>
              {ExternalSourceTypeOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">默认业务线</label>
            <select name="businessLineId" defaultValue={source?.businessLineId || ""}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">不指定</option>
              {businessLines.map((bl) => (
                <option key={bl.id} value={bl.id}>{bl.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4 text-gray-800">默认值设置</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">默认来源渠道</label>
            <select name="defaultSource" defaultValue={source?.defaultSource || "WEBSITE"}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
              {LeadSourceOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">默认客户等级</label>
            <select name="defaultLeadGrade" defaultValue={source?.defaultLeadGrade || "C"}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
              {LeadGradeOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">默认优先级</label>
            <select name="defaultPriority" defaultValue={source?.defaultPriority || "MEDIUM"}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
              {TaskPriorityOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4 text-gray-800">高级设置</h3>
        <div className="flex items-center gap-2">
          <input name="autoAnalyze" type="checkbox" defaultChecked={source?.autoAnalyze ?? false}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
          <label className="text-sm font-medium text-gray-700">收到线索后自动触发 AI 分析</label>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">备注</label>
        <textarea name="notes" rows={3} defaultValue={source?.notes || ""}
          className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="内部备注..." />
      </div>

      <div className="flex gap-3 pt-4 border-t">
        <button type="submit"
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors">
          {submitLabel}
        </button>
        <Link href="/external-sources"
          className="px-6 py-2 border rounded-lg hover:bg-gray-50 transition-colors">
          取消返回
        </Link>
      </div>
    </form>
  );
}
