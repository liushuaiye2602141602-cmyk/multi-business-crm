"use client";

import { useState } from "react";
import { Copy, Check, Sparkles, Loader2 } from "lucide-react";

interface AIAnalysisResultProps {
  analysis: {
    summary?: string | null;
    requirementSummary?: string | null;
    extractedRequirements?: string | null;
    qualificationLevel?: string | null;
    intentLevel?: string | null;
    buyerTypeGuess?: string | null;
    riskPoints?: string | null;
    missingInfo?: string | null;
    suggestedQuestions?: string | null;
    nextAction?: string | null;
    whatsappReply?: string | null;
    emailSubject?: string | null;
    emailReply?: string | null;
    internalSalesNote?: string | null;
  };
  onApplyGrade?: () => Promise<void>;
  onAppendToNotes?: () => Promise<void>;
  onCreateTask?: () => Promise<void>;
}

function CopyButton({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1 text-xs text-gray-500 hover:text-blue-600 transition-colors"
    >
      {copied ? <Check size={14} /> : <Copy size={14} />}
      {copied ? "已复制" : label || "复制"}
    </button>
  );
}

export default function AIAnalysisResult({
  analysis,
  onApplyGrade,
  onAppendToNotes,
  onCreateTask,
}: AIAnalysisResultProps) {
  const [isLoading, setIsLoading] = useState<string | null>(null);

  async function handleAction(action: () => Promise<void>, actionName: string) {
    setIsLoading(actionName);
    try {
      await action();
    } finally {
      setIsLoading(null);
    }
  }

  const qualificationColors: Record<string, string> = {
    A: "bg-red-100 text-red-700",
    B: "bg-orange-100 text-orange-700",
    C: "bg-blue-100 text-blue-700",
    D: "bg-gray-100 text-gray-700",
  };

  const intentColors: Record<string, string> = {
    High: "bg-green-100 text-green-700",
    Medium: "bg-yellow-100 text-yellow-700",
    Low: "bg-gray-100 text-gray-700",
    Unknown: "bg-gray-100 text-gray-700",
  };

  return (
    <div className="space-y-4">
      {/* 客户质量与意向 */}
      {(analysis.qualificationLevel || analysis.intentLevel || analysis.buyerTypeGuess) && (
        <div className="flex flex-wrap gap-2">
          {analysis.qualificationLevel && (
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${qualificationColors[analysis.qualificationLevel.toUpperCase()] || "bg-gray-100 text-gray-700"}`}>
              等级: {analysis.qualificationLevel}
            </span>
          )}
          {analysis.intentLevel && (
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${intentColors[analysis.intentLevel] || "bg-gray-100 text-gray-700"}`}>
              意向: {analysis.intentLevel}
            </span>
          )}
          {analysis.buyerTypeGuess && (
            <span className="px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-700">
              类型: {analysis.buyerTypeGuess}
            </span>
          )}
        </div>
      )}

      {/* 需求总结 */}
      {analysis.summary && (
        <div>
          <p className="text-sm font-medium text-gray-500 mb-1">需求总结</p>
          <p className="text-sm whitespace-pre-wrap">{analysis.summary}</p>
        </div>
      )}

      {/* 结构化需求 */}
      {analysis.requirementSummary && (
        <div>
          <p className="text-sm font-medium text-gray-500 mb-1">结构化需求</p>
          <p className="text-sm whitespace-pre-wrap">{analysis.requirementSummary}</p>
        </div>
      )}

      {/* 风险点 */}
      {analysis.riskPoints && (
        <div>
          <p className="text-sm font-medium text-gray-500 mb-1">风险点</p>
          <p className="text-sm whitespace-pre-wrap text-red-600">{analysis.riskPoints}</p>
        </div>
      )}

      {/* 缺失信息 */}
      {analysis.missingInfo && (
        <div>
          <p className="text-sm font-medium text-gray-500 mb-1">缺失信息</p>
          <p className="text-sm whitespace-pre-wrap text-orange-600">{analysis.missingInfo}</p>
        </div>
      )}

      {/* 建议追问 */}
      {analysis.suggestedQuestions && (
        <div>
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm font-medium text-gray-500">建议追问问题</p>
            <CopyButton text={analysis.suggestedQuestions} label="复制问题" />
          </div>
          <div className="bg-yellow-50 rounded-lg p-3 whitespace-pre-wrap text-sm">
            {analysis.suggestedQuestions}
          </div>
        </div>
      )}

      {/* WhatsApp 回复 */}
      {analysis.whatsappReply && (
        <div>
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm font-medium text-gray-500">WhatsApp 回复草稿</p>
            <CopyButton text={analysis.whatsappReply} label="复制 WhatsApp" />
          </div>
          <div className="bg-green-50 rounded-lg p-3 whitespace-pre-wrap text-sm">
            {analysis.whatsappReply}
          </div>
        </div>
      )}

      {/* Email 回复 */}
      {analysis.emailReply && (
        <div>
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm font-medium text-gray-500">
              Email 回复草稿
              {analysis.emailSubject && <span className="text-gray-400 ml-2">标题: {analysis.emailSubject}</span>}
            </p>
            <CopyButton text={analysis.emailReply} label="复制 Email" />
          </div>
          <div className="bg-blue-50 rounded-lg p-3 whitespace-pre-wrap text-sm">
            {analysis.emailReply}
          </div>
        </div>
      )}

      {/* 下一步动作 */}
      {analysis.nextAction && (
        <div>
          <p className="text-sm font-medium text-gray-500 mb-1">下一步动作</p>
          <p className="text-sm whitespace-pre-wrap font-medium">{analysis.nextAction}</p>
        </div>
      )}

      {/* 内部销售备注 */}
      {analysis.internalSalesNote && (
        <div>
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm font-medium text-gray-500">内部销售备注</p>
            <CopyButton text={analysis.internalSalesNote} label="复制备注" />
          </div>
          <div className="bg-gray-50 rounded-lg p-3 whitespace-pre-wrap text-sm">
            {analysis.internalSalesNote}
          </div>
        </div>
      )}

      {/* 操作按钮 */}
      {(onApplyGrade || onAppendToNotes || onCreateTask) && (
        <div className="flex flex-wrap gap-2 pt-4 border-t">
          {onApplyGrade && analysis.qualificationLevel && (
            <button
              onClick={() => handleAction(onApplyGrade, "applyGrade")}
              disabled={isLoading !== null}
              className="flex items-center gap-2 bg-purple-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-purple-700 transition-colors disabled:opacity-50"
            >
              {isLoading === "applyGrade" ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
              应用客户等级建议
            </button>
          )}
          {onAppendToNotes && (
            <button
              onClick={() => handleAction(onAppendToNotes, "appendNotes")}
              disabled={isLoading !== null}
              className="flex items-center gap-2 bg-blue-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {isLoading === "appendNotes" ? <Loader2 size={14} className="animate-spin" /> : <Copy size={14} />}
              追加到备注
            </button>
          )}
          {onCreateTask && analysis.nextAction && (
            <button
              onClick={() => handleAction(onCreateTask, "createTask")}
              disabled={isLoading !== null}
              className="flex items-center gap-2 bg-green-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              {isLoading === "createTask" ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
              一键创建跟进任务
            </button>
          )}
        </div>
      )}
    </div>
  );
}
