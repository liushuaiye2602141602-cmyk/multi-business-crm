import Link from "next/link";
import { Download, Users, UserCheck, FolderKanban, FileText, CheckSquare, MessageSquare, Package, Sparkles, Webhook } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import Card from "@/components/ui/Card";

const exportItems = [
  {
    title: "线索",
    description: "导出所有线索数据，包括公司名、联系人、国家、邮箱、WhatsApp、业务线、来源、状态、等级等",
    href: "/api/export/leads",
    icon: Users,
    color: "text-blue-600 bg-blue-50",
    fields: "公司名、联系人、国家、邮箱、WhatsApp、来源、业务线、产品兴趣、状态、等级等",
  },
  {
    title: "客户",
    description: "导出所有客户数据，包括公司名、联系人、国家、邮箱、WhatsApp、业务线、客户类型、状态等",
    href: "/api/export/customers",
    icon: UserCheck,
    color: "text-green-600 bg-green-50",
    fields: "公司名、联系人、国家、邮箱、WhatsApp、网站、业务线、客户类型、状态、等级等",
  },
  {
    title: "商机项目",
    description: "导出所有项目数据，包括项目名称、客户、业务线、产品、状态、金额等",
    href: "/api/export/projects",
    icon: FolderKanban,
    color: "text-purple-600 bg-purple-50",
    fields: "项目名称、客户、业务线、产品名称、规格、数量、状态、金额、备注等",
  },
  {
    title: "报价",
    description: "导出所有报价数据，包括报价编号、客户、产品、金额、状态等",
    href: "/api/export/quotes",
    icon: FileText,
    color: "text-indigo-600 bg-indigo-50",
    fields: "报价编号、客户、产品名称、规格、数量、单价、总价、币种、状态等",
  },
  {
    title: "任务",
    description: "导出所有任务数据，包括标题、类型、状态、优先级、截止日期、关联对象等",
    href: "/api/export/tasks",
    icon: CheckSquare,
    color: "text-orange-600 bg-orange-50",
    fields: "标题、类型、状态、优先级、截止日期、关联线索/客户/项目、描述等",
  },
  {
    title: "跟进记录",
    description: "导出所有跟进记录，包括跟进方式、内容、客户反馈、下一步动作等",
    href: "/api/export/follow-ups",
    icon: MessageSquare,
    color: "text-teal-600 bg-teal-50",
    fields: "跟进方式、内容、客户反馈、下一步动作、关联对象、跟进日期等",
  },
  {
    title: "产品",
    description: "导出所有产品数据，包括名称、业务线、分类、关键词、规格等",
    href: "/api/export/products",
    icon: Package,
    color: "text-indigo-600 bg-indigo-50",
    fields: "产品名称、业务线、分类、关键词、规格、用途、目标市场、状态等",
  },
  {
    title: "AI 分析",
    description: "导出所有 AI 分析记录，包括标题、摘要、客户等级、意向程度、下一步动作等",
    href: "/api/export/ai-analyses",
    icon: Sparkles,
    color: "text-pink-600 bg-pink-50",
    fields: "对象类型、对象ID、标题、摘要、客户等级、意向程度、下一步动作等",
  },
  {
    title: "Webhook 日志",
    description: "导出最近 1000 条 Webhook 调用日志",
    href: "/api/export/webhook-logs",
    icon: Webhook,
    color: "text-teal-600 bg-teal-50",
    fields: "状态、来源代码、IP地址、错误信息、时间等",
  },
];

export default function ExportsPage() {
  return (
    <div>
      <PageHeader
        title="数据导出"
        description="集中管理所有数据导出，CSV 格式，支持 Excel 直接打开"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {exportItems.map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.title} className="hover:shadow-md transition-shadow">
              <div className="flex items-start gap-3 mb-3">
                <div className={`p-2 rounded-lg ${item.color}`}>
                  <Icon size={20} />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">{item.title}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">{item.description}</p>
                </div>
              </div>
              <div className="mb-3">
                <p className="text-xs text-gray-400">导出字段：</p>
                <p className="text-xs text-gray-600 mt-0.5">{item.fields}</p>
              </div>
              <a
                href={item.href}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors w-full justify-center"
              >
                <Download size={16} />
                导出 CSV
              </a>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
