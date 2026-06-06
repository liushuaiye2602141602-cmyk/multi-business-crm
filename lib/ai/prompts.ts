const BASE_SYSTEM_PROMPT = `你是一个专业 B2B 外贸销售助手，帮助用户分析客户询盘、客户跟进记录和项目需求。

语言要求：
- 所有分析说明用中文
- 对客户的 WhatsApp 和 Email 回复必须是英文
- WhatsApp 回复要简短、自然、口语化，像真实业务员在手机上快速回复
- Email 回复要专业、清晰，但不要太长
- 不要编造客户没有提供的信息
- 不确定的信息必须放入 missingInfo
- 如果客户询盘信息很少，要优先生成补充确认问题，而不是直接报价

请严格返回 JSON 格式，字段包括：
{
  "summary": "客户需求总结（中文）",
  "requirementSummary": "结构化需求总结，列出客户提供的所有关键信息（中文）",
  "extractedRequirements": "JSON字符串，提取的结构化需求，如 {\"product\":\"...\",\"quantity\":\"...\",\"size\":\"...\",\"material\":\"...\",\"application\":\"...\",\"targetMarket\":\"...\",\"specialRequirements\":[\"...\"]}",
  "qualificationLevel": "客户质量判断 A/B/C/D，A=高质量大客户，B=有潜力客户，C=一般客户，D=低质量或信息太少",
  "intentLevel": "意向程度 High/Medium/Low/Unknown",
  "buyerTypeGuess": "客户类型判断: Brand Owner / Manufacturer / Distributor / Trader / Startup / Unknown",
  "riskPoints": "风险点，如信息不完整、目标价过低、需求不清楚、疑似贸易商、无明确数量等",
  "missingInfo": "缺失的关键信息，列出客户没有提供但报价必须知道的信息",
  "suggestedQuestions": "建议追问客户的问题，用英文，可以直接发给客户",
  "nextAction": "下一步动作建议（中文）",
  "whatsappReply": "WhatsApp 回复草稿（英文，简短口语化）",
  "emailSubject": "邮件标题（英文）",
  "emailReply": "Email 回复草稿（英文）",
  "internalSalesNote": "内部销售备注（中文），给业务员自己的分析笔记"
}`;

const FLEXIBLE_PACKAGING_PROMPT = `
你是软包装行业外贸专家。重点检查客户是否提供以下信息：

【必须信息】
- pouch type / bag type（袋型：stand up pouch, spout pouch, flat bottom pouch, quad seal bag, retort pouch 等）
- size / capacity（尺寸/容量）
- product packed inside（装什么产品）
- quantity（数量）
- material / barrier requirement（材质结构、阻隔要求）

【重要信息】
- printing requirement（印刷要求：几色、是否有设计稿）
- zipper / spout / handle / valve / window（是否需要拉链、吸嘴、提手、阀门、透明窗口）
- target market（目标市场，影响食品级认证要求）
- filling / sealing method（灌装封口方式）
- sample need（是否需要样品）

【加分信息】
- 是否需要耐蒸煮（retort）
- 是否需要冷冻（frozen food）
- 是否有灌装机适配要求
- 交期要求
- 目标价格

如果客户只说了"I need pouches"或"send me price"，信息严重不足，必须优先追问袋型、容量、材质、数量。`;

const PACKAGING_MACHINERY_PROMPT = `
你是包装机/灌装机行业外贸专家。重点检查客户是否提供以下信息：

【必须信息】
- product material（包装物料：液体、粉末、颗粒、膏体）
- container type（容器类型：袋装、瓶装、盒装、罐装）
- filling volume（灌装量）
- speed / capacity（产能要求：xxx pcs/hour）

【重要信息】
- automation level（自动化程度：半自动、全自动）
- voltage（电压：220V/380V/415V）
- factory space（工厂空间）
- budget（预算范围）
- target market（目标市场）

【加分信息】
- 是否需要整线（complete line）
- 灌装精度要求
- 现有设备情况
- 是否有特殊要求（防爆、防腐蚀等）
- 交期要求

如果客户只说了"I need filling machine"，信息严重不足，必须优先追问物料类型、容器类型、产能要求。`;

const WOODEN_CRAFTS_PROMPT = `
你是木质工艺品行业外贸专家。重点检查客户是否提供以下信息：

【必须信息】
- product type（产品类型：wooden box, tray, decoration, sign, toy, display stand 等）
- size（尺寸）
- quantity（数量）

【重要信息】
- material（木材材质：pine, oak, bamboo, MDF 等）
- surface finish（表面工艺：painting, varnish, laser engraving 等）
- logo / custom design（是否需要定制logo/设计）
- packaging（包装方式）
- target market（目标市场）

【加分信息】
- 是否节日产品（Christmas, Easter, Halloween 等）
- 是否 OEM/ODM
- 是否有设计图（AI/DXF/PDF）
- 交期要求
- 目标价格

如果客户只说了"I need wooden boxes"，信息严重不足，必须优先追问尺寸、材质、数量、用途。`;

function getBusinessLinePrompt(businessLineCode?: string): string {
  switch (businessLineCode) {
    case "FLEX":
      return FLEXIBLE_PACKAGING_PROMPT;
    case "PACK":
      return PACKAGING_MACHINERY_PROMPT;
    case "WOOD":
      return WOODEN_CRAFTS_PROMPT;
    default:
      return "";
  }
}

export function buildLeadAnalysisPrompt(lead: {
  company: string;
  contactName: string;
  country?: string | null;
  email?: string | null;
  whatsapp?: string | null;
  source?: string;
  sourceWebsite?: string | null;
  interestProducts?: string | null;
  inquiryContent?: string | null;
  requirement?: string | null;
  remark?: string | null;
  businessLineName?: string;
  businessLineCode?: string;
  followUps?: Array<{
    content: string;
    customerFeedback?: string | null;
    nextAction?: string | null;
  }>;
}): Array<{ role: "system" | "user"; content: string }> {
  const businessLinePrompt = getBusinessLinePrompt(lead.businessLineCode);
  const systemPrompt = BASE_SYSTEM_PROMPT + (businessLinePrompt ? "\n\n" + businessLinePrompt : "");

  const followUpText = lead.followUps?.length
    ? `\n\n已有跟进记录：\n${lead.followUps.map((fu, i) => `${i + 1}. ${fu.content}${fu.customerFeedback ? `\n   客户反馈: ${fu.customerFeedback}` : ""}${fu.nextAction ? `\n   下一步: ${fu.nextAction}` : ""}`).join("\n")}`
    : "";

  return [
    { role: "system", content: systemPrompt },
    {
      role: "user",
      content: `请分析以下线索信息：

业务线：${lead.businessLineName || "未知"}
公司名：${lead.company}
联系人：${lead.contactName}
国家：${lead.country || "未知"}
邮箱：${lead.email || "未知"}
WhatsApp：${lead.whatsapp || "未知"}
来源渠道：${lead.source || "未知"}
来源网站：${lead.sourceWebsite || "未知"}
感兴趣产品：${lead.interestProducts || "未知"}
询盘内容：${lead.inquiryContent || "未知"}
需求描述：${lead.requirement || "未知"}
备注：${lead.remark || "未知"}${followUpText}

请分析这个线索，返回 JSON 格式的结果。`,
    },
  ];
}

export function buildCustomerReviewPrompt(customer: {
  company: string;
  contactName: string;
  country?: string | null;
  email?: string | null;
  whatsapp?: string | null;
  customerType?: string;
  customerStatus?: string;
  leadGrade?: string;
  businessLineName?: string;
  businessLineCode?: string;
  remark?: string | null;
  projects?: Array<{
    name: string;
    status: string;
    productName?: string | null;
    amount?: number | null;
  }>;
  followUps?: Array<{
    content: string;
    customerFeedback?: string | null;
    followUpDate: Date;
  }>;
  quotes?: Array<{
    quoteNo: string;
    status: string;
    totalPrice?: number | null;
  }>;
  tasks?: Array<{
    title: string;
    status: string;
    dueDate?: Date | null;
  }>;
}): Array<{ role: "system" | "user"; content: string }> {
  const businessLinePrompt = getBusinessLinePrompt(customer.businessLineCode);
  const systemPrompt = BASE_SYSTEM_PROMPT + (businessLinePrompt ? "\n\n" + businessLinePrompt : "");

  const projectText = customer.projects?.length
    ? `\n\n关联项目：\n${customer.projects.map((p) => `- ${p.name} (${p.status}) ${p.productName || ""} ${p.amount ? `金额: ${p.amount}` : ""}`).join("\n")}`
    : "";

  const followUpText = customer.followUps?.length
    ? `\n\n最近跟进记录：\n${customer.followUps.slice(0, 5).map((fu) => `- ${new Date(fu.followUpDate).toLocaleDateString("zh-CN")}: ${fu.content}${fu.customerFeedback ? `\n  客户反馈: ${fu.customerFeedback}` : ""}`).join("\n")}`
    : "";

  const quoteText = customer.quotes?.length
    ? `\n\n报价记录：\n${customer.quotes.map((q) => `- ${q.quoteNo} (${q.status}) ${q.totalPrice ? `金额: ${q.totalPrice}` : ""}`).join("\n")}`
    : "";

  const taskText = customer.tasks?.length
    ? `\n\n待办任务：\n${customer.tasks.map((t) => `- ${t.title} (${t.status}) ${t.dueDate ? `截止: ${new Date(t.dueDate).toLocaleDateString("zh-CN")}` : ""}`).join("\n")}`
    : "";

  return [
    { role: "system", content: systemPrompt },
    {
      role: "user",
      content: `请复盘以下客户信息：

业务线：${customer.businessLineName || "未知"}
公司名：${customer.company}
联系人：${customer.contactName}
国家：${customer.country || "未知"}
客户类型：${customer.customerType || "未知"}
客户状态：${customer.customerStatus || "未知"}
客户等级：${customer.leadGrade || "未知"}
备注：${customer.remark || "无"}${projectText}${followUpText}${quoteText}${taskText}

请复盘这个客户，返回 JSON 格式的结果。`,
    },
  ];
}

export function buildProjectAnalysisPrompt(project: {
  name: string;
  status: string;
  productCategory?: string | null;
  productName?: string | null;
  specs?: string | null;
  quantity?: string | null;
  usage?: string | null;
  targetMarket?: string | null;
  specialRequirements?: string | null;
  amount?: number | null;
  currency?: string;
  description?: string | null;
  remark?: string | null;
  businessLineName?: string;
  businessLineCode?: string;
  customerName?: string;
  leadName?: string | null;
  followUps?: Array<{
    content: string;
    customerFeedback?: string | null;
  }>;
  quotes?: Array<{
    quoteNo: string;
    status: string;
    totalPrice?: number | null;
  }>;
}): Array<{ role: "system" | "user"; content: string }> {
  const businessLinePrompt = getBusinessLinePrompt(project.businessLineCode);
  const systemPrompt = BASE_SYSTEM_PROMPT + (businessLinePrompt ? "\n\n" + businessLinePrompt : "");

  const followUpText = project.followUps?.length
    ? `\n\n跟进记录：\n${project.followUps.map((fu) => `- ${fu.content}${fu.customerFeedback ? `\n  客户反馈: ${fu.customerFeedback}` : ""}`).join("\n")}`
    : "";

  const quoteText = project.quotes?.length
    ? `\n\n报价记录：\n${project.quotes.map((q) => `- ${q.quoteNo} (${q.status}) ${q.totalPrice ? `金额: ${q.totalPrice}` : ""}`).join("\n")}`
    : "";

  return [
    { role: "system", content: systemPrompt },
    {
      role: "user",
      content: `请分析以下项目信息：

业务线：${project.businessLineName || "未知"}
项目名称：${project.name}
客户：${project.customerName}
关联线索：${project.leadName || "无"}
项目状态：${project.status}
产品类别：${project.productCategory || "未知"}
产品名称：${project.productName || "未知"}
规格：${project.specs || "未知"}
数量：${project.quantity || "未知"}
用途：${project.usage || "未知"}
目标市场：${project.targetMarket || "未知"}
特殊要求：${project.specialRequirements || "未知"}
预计金额：${project.amount ? `${project.currency || "USD"} ${project.amount}` : "未知"}
项目描述：${project.description || "无"}
备注：${project.remark || "无"}${followUpText}${quoteText}

请分析这个项目，返回 JSON 格式的结果。`,
    },
  ];
}

export function buildFollowUpReplyPrompt(followUp: {
  content: string;
  customerFeedback?: string | null;
  nextAction?: string | null;
  method?: string;
  relatedInfo?: {
    type: "lead" | "customer" | "project";
    name: string;
    businessLine?: string;
    businessLineCode?: string;
    country?: string;
    previousFollowUps?: string[];
  };
}): Array<{ role: "system" | "user"; content: string }> {
  const businessLinePrompt = getBusinessLinePrompt(followUp.relatedInfo?.businessLineCode);
  const systemPrompt = BASE_SYSTEM_PROMPT + (businessLinePrompt ? "\n\n" + businessLinePrompt : "");

  const previousText = followUp.relatedInfo?.previousFollowUps?.length
    ? `\n\n之前的跟进记录：\n${followUp.relatedInfo.previousFollowUps.map((p, i) => `${i + 1}. ${p}`).join("\n")}`
    : "";

  return [
    { role: "system", content: systemPrompt },
    {
      role: "user",
      content: `请根据以下跟进记录生成下一步回复：

跟进方式：${followUp.method || "未知"}
跟进内容：${followUp.content}
客户反馈：${followUp.customerFeedback || "无"}
下一步动作：${followUp.nextAction || "无"}

关联对象：${followUp.relatedInfo?.type === "lead" ? "线索" : followUp.relatedInfo?.type === "customer" ? "客户" : "项目"} - ${followUp.relatedInfo?.name || "未知"}
业务线：${followUp.relatedInfo?.businessLine || "未知"}
国家：${followUp.relatedInfo?.country || "未知"}${previousText}

请生成下一步回复，返回 JSON 格式的结果。`,
    },
  ];
}

export function buildTemplateRewritePrompt(template: {
  title: string;
  scene: string;
  content: string;
  language?: string;
  rewriteType: "whatsapp" | "email" | "high_intent";
}): Array<{ role: "system" | "user"; content: string }> {
  const rewriteInstructions: Record<string, string> = {
    whatsapp: "请将这个模板改写成适合 WhatsApp 的简短口语化版本。要求：简短、自然、直接、适合移动端阅读、保留关键信息。像真实业务员在手机上快速回复客户。",
    email: "请将这个模板改写成正式的 Email 版本。要求：专业、礼貌、结构清晰、适合商务邮件格式。不要太长，重点突出。",
    high_intent: "请将这个模板改写成更适合高意向客户的版本。要求：更有针对性、强调价值、推动成交、但不过于激进。让客户感觉被重视。",
  };

  return [
    { role: "system", content: BASE_SYSTEM_PROMPT },
    {
      role: "user",
      content: `请改写以下跟进模板：

模板标题：${template.title}
模板场景：${template.scene}
原语言：${template.language || "英文"}

原模板内容：
${template.content}

改写要求：${rewriteInstructions[template.rewriteType] || "请改写这个模板"}

请返回 JSON 格式的结果，包含改写后的内容。`,
    },
  ];
}

export function buildTestPrompt(inquiry: string, businessLineCode: string): Array<{ role: "system" | "user"; content: string }> {
  const businessLinePrompt = getBusinessLinePrompt(businessLineCode);
  const systemPrompt = BASE_SYSTEM_PROMPT + (businessLinePrompt ? "\n\n" + businessLinePrompt : "");

  return [
    { role: "system", content: systemPrompt },
    {
      role: "user",
      content: `请分析以下客户询盘：

${inquiry}

请分析这个询盘，返回 JSON 格式的结果。`,
    },
  ];
}
