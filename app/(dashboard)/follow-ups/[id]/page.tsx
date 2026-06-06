import Link from "next/link";
import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import { Pencil } from "lucide-react";
import { FollowUpMethodLabel } from "@/lib/enums";
import { formatDate, formatEnumLabel } from "@/lib/format";
import { isAIConfigured } from "@/lib/ai/types";
import { generateFollowUpReply } from "@/lib/ai/actions";
import PageHeader from "@/components/PageHeader";
import Badge from "@/components/Badge";
import AIAnalysisButton from "@/components/AIAnalysisButton";
import AIAnalysisResult from "@/components/AIAnalysisResult";

export default async function FollowUpDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const followUpId = parseInt(id);

  const [followUp, latestAnalysis] = await Promise.all([
    prisma.followUp.findUnique({
      where: { id: followUpId },
      include: {
        lead: true,
        customer: true,
        project: { include: { customer: true } },
      },
    }),
    prisma.aIAnalysis.findFirst({
      where: { targetType: "FOLLOW_UP", targetId: followUpId },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  if (!followUp) return notFound();

  const aiConfigured = isAIConfigured();

  // 获取关联对象信息
  const relatedEntity = followUp.customer
    ? { type: "客户", name: followUp.customer.company, href: `/customers/${followUp.customerId}` }
    : followUp.lead
    ? { type: "线索", name: followUp.lead.company, href: `/leads/${followUp.leadId}` }
    : followUp.project
    ? { type: "项目", name: followUp.project.name, href: `/projects/${followUp.projectId}` }
    : null;

  return (
    <div>
      <PageHeader
        title="跟进详情"
        backHref="/follow-ups"
        action={{ label: "编辑", href: `/follow-ups/${followUp.id}/edit`, icon: <Pencil size={16} /> }}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 基本信息 */}
        <div className="bg-white rounded-lg border p-6">
          <h2 className="text-lg font-semibold mb-4">基本信息</h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">跟进方式：</span>
              <Badge label={formatEnumLabel(followUp.method, FollowUpMethodLabel)} />
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">跟进日期：</span>
              <span>{formatDate(followUp.followUpDate)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">下次跟进：</span>
              <span>{formatDate(followUp.nextFollowUpDate)}</span>
            </div>
            {relatedEntity && (
              <div className="flex justify-between">
                <span className="text-gray-500">关联对象：</span>
                <Link href={relatedEntity.href} className="text-blue-600 hover:underline">
                  {relatedEntity.type}: {relatedEntity.name}
                </Link>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-500">创建时间：</span>
              <span>{formatDate(followUp.createdAt)}</span>
            </div>
          </div>
        </div>

        {/* 跟进内容 */}
        <div className="bg-white rounded-lg border p-6">
          <h2 className="text-lg font-semibold mb-4">跟进内容</h2>
          <div className="whitespace-pre-wrap text-sm">{followUp.content}</div>
        </div>
      </div>

      {/* 客户反馈和下一步 */}
      {(followUp.customerFeedback || followUp.nextAction) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          {followUp.customerFeedback && (
            <div className="bg-white rounded-lg border p-6">
              <h2 className="text-lg font-semibold mb-4">客户反馈</h2>
              <div className="whitespace-pre-wrap text-sm">{followUp.customerFeedback}</div>
            </div>
          )}
          {followUp.nextAction && (
            <div className="bg-white rounded-lg border p-6">
              <h2 className="text-lg font-semibold mb-4">下一步动作</h2>
              <div className="whitespace-pre-wrap text-sm">{followUp.nextAction}</div>
            </div>
          )}
        </div>
      )}

      {/* 备注 */}
      {followUp.remark && (
        <div className="bg-white rounded-lg border p-6 mt-6">
          <h2 className="text-lg font-semibold mb-4">备注</h2>
          <div className="whitespace-pre-wrap text-sm">{followUp.remark}</div>
        </div>
      )}

      {/* AI 生成回复 */}
      <div className="bg-white rounded-lg border p-6 mt-6">
        <h2 className="text-lg font-semibold mb-4">AI 辅助</h2>
        <AIAnalysisButton
          action={async () => {
            "use server";
            return generateFollowUpReply(followUpId);
          }}
          label="AI 生成下一步回复"
          isAIConfigured={aiConfigured}
        />
        {latestAnalysis && (
          <div className="mt-4 pt-4 border-t">
            <p className="text-sm text-gray-500 mb-2">
              最近一次分析：{new Date(latestAnalysis.createdAt).toLocaleString("zh-CN")}
            </p>
            <AIAnalysisResult analysis={latestAnalysis} />
          </div>
        )}
      </div>
    </div>
  );
}
