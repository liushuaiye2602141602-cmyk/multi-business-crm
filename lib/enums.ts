// ==================== 标签映射 ====================

export const LeadSourceLabel: Record<string, string> = {
  MANUAL_OUTREACH: "手动开发",
  WEBSITE: "独立站",
  FACEBOOK: "Facebook",
  TIKTOK: "TikTok",
  WHATSAPP: "WhatsApp",
  EMAIL: "邮箱",
  REFERRAL: "转介绍",
  EXHIBITION: "展会",
  OTHER: "其他",
};

export const LeadStatusLabel: Record<string, string> = {
  NEW: "新建",
  CONTACTED: "已联系",
  REQUIREMENT_CONFIRMING: "需求确认中",
  QUOTING: "报价中",
  NEGOTIATING: "谈判中",
  QUALIFIED: "已确认",
  WON: "已成交",
  LOST: "已流失",
  DORMANT: "休眠",
};

export const LeadTemperatureLabel: Record<string, string> = {
  HOT: "高意向",
  WARM: "中意向",
  COLD: "低意向",
};

export const LeadGradeLabel: Record<string, string> = {
  A: "A级",
  B: "B级",
  C: "C级",
  D: "D级",
};

export const CustomerTypeLabel: Record<string, string> = {
  IMPORTER: "进口商",
  DISTRIBUTOR: "经销商",
  MANUFACTURER: "制造商",
  TRADER: "贸易商",
  BRAND_OWNER: "品牌商",
  RETAILER: "零售商",
  UNKNOWN: "未知",
};

export const CustomerStatusLabel: Record<string, string> = {
  ACTIVE: "活跃",
  POTENTIAL: "潜在",
  INACTIVE: "不活跃",
  WON: "已成交",
  LOST: "已流失",
  BLACKLIST: "黑名单",
};

export const ProjectStatusLabel: Record<string, string> = {
  REQUIREMENT_CONFIRMING: "需求确认中",
  QUOTING: "报价中",
  SAMPLE_TESTING: "样品测试中",
  WAITING_FEEDBACK: "等待反馈",
  NEGOTIATING: "谈判中",
  WON: "已成交",
  LOST: "已流失",
  PAUSED: "暂停",
};

export const FollowUpMethodLabel: Record<string, string> = {
  EMAIL: "邮件",
  WHATSAPP: "WhatsApp",
  PHONE: "电话",
  MEETING: "面谈",
  VIDEO_CALL: "视频会议",
  OTHER: "其他",
};

export const TaskTypeLabel: Record<string, string> = {
  FOLLOW_UP: "跟进",
  CALL: "电话",
  MEETING: "会议",
  QUOTE: "报价",
  SAMPLE: "样品",
  OTHER: "其他",
};

export const TaskStatusLabel: Record<string, string> = {
  PENDING: "待处理",
  IN_PROGRESS: "进行中",
  COMPLETED: "已完成",
  CANCELLED: "已取消",
};

export const TaskPriorityLabel: Record<string, string> = {
  LOW: "低",
  MEDIUM: "中",
  HIGH: "高",
  URGENT: "紧急",
};

export const QuoteStatusLabel: Record<string, string> = {
  DRAFT: "草稿",
  SENT: "已发送",
  WAITING_FEEDBACK: "等待反馈",
  REVISED: "已修改",
  ACCEPTED: "已接受",
  REJECTED: "已拒绝",
  EXPIRED: "已过期",
};

export const CurrencyLabel: Record<string, string> = {
  USD: "USD",
  EUR: "EUR",
  CNY: "CNY",
};

// ==================== 选项列表 ====================

export const LeadSourceOptions = Object.entries(LeadSourceLabel).map(([value, label]) => ({ value, label }));
export const LeadStatusOptions = Object.entries(LeadStatusLabel).map(([value, label]) => ({ value, label }));
export const LeadTemperatureOptions = Object.entries(LeadTemperatureLabel).map(([value, label]) => ({ value, label }));
export const LeadGradeOptions = Object.entries(LeadGradeLabel).map(([value, label]) => ({ value, label }));
export const CustomerTypeOptions = Object.entries(CustomerTypeLabel).map(([value, label]) => ({ value, label }));
export const CustomerStatusOptions = Object.entries(CustomerStatusLabel).map(([value, label]) => ({ value, label }));
export const ProjectStatusOptions = Object.entries(ProjectStatusLabel).map(([value, label]) => ({ value, label }));
export const FollowUpMethodOptions = Object.entries(FollowUpMethodLabel).map(([value, label]) => ({ value, label }));
export const TaskTypeOptions = Object.entries(TaskTypeLabel).map(([value, label]) => ({ value, label }));
export const TaskStatusOptions = Object.entries(TaskStatusLabel).map(([value, label]) => ({ value, label }));
export const TaskPriorityOptions = Object.entries(TaskPriorityLabel).map(([value, label]) => ({ value, label }));
export const QuoteStatusOptions = Object.entries(QuoteStatusLabel).map(([value, label]) => ({ value, label }));
export const CurrencyOptions = Object.entries(CurrencyLabel).map(([value, label]) => ({ value, label }));

export const TemplateSceneLabel: Record<string, string> = {
  FIRST_REPLY: "首次回复",
  QUOTE_CONFIRMATION: "报价确认",
  QUOTE_FOLLOW_UP: "报价跟进",
  SAMPLE_FOLLOW_UP: "样品跟进",
  NO_REPLY_FOLLOW_UP: "未回复跟进",
  PRICE_NEGOTIATION: "价格谈判",
  ORDER_CONFIRMATION: "订单确认",
  AFTER_SALES: "售后服务",
  OTHER: "其他",
};

export const TemplateLanguageLabel: Record<string, string> = {
  EN: "英文",
  CN: "中文",
  BOTH: "中英双语",
};

export const TemplateSceneOptions = Object.entries(TemplateSceneLabel).map(([value, label]) => ({ value, label }));
export const TemplateLanguageOptions = Object.entries(TemplateLanguageLabel).map(([value, label]) => ({ value, label }));

export const ExternalSourceTypeLabel: Record<string, string> = {
  WEBSITE_FORM: "官网表单",
  FACEBOOK_FORM: "Facebook 表单",
  TIKTOK_MANUAL: "TikTok 手动",
  N8N: "n8n 工作流",
  AI_MARKETING_SYSTEM: "AI 营销系统",
  OTHER: "其他平台",
  WHATSAPP_MANUAL: "WhatsApp 手动",
};

export const WebhookStatusLabel: Record<string, string> = {
  SUCCESS: "成功",
  FAILED: "失败",
  UNAUTHORIZED: "未授权",
  DUPLICATE: "重复",
  VALIDATION_ERROR: "参数错误",
};

export const ExternalSourceTypeOptions = Object.entries(ExternalSourceTypeLabel).map(([value, label]) => ({ value, label }));
export const WebhookStatusOptions = Object.entries(WebhookStatusLabel).map(([value, label]) => ({ value, label }));

export const InvoiceStatusLabel: Record<string, string> = {
  DRAFT: "草稿",
  SENT: "已发送",
  PAID: "已付款",
  OVERDUE: "已逾期",
  CANCELLED: "已取消",
};

export const PaymentMethodLabel: Record<string, string> = {
  TT: "电汇",
  LC: "信用证",
  PAYPAL: "PayPal",
  WESTERN_UNION: "西联汇款",
  CASH: "现金",
  OTHER: "其他",
};

export const OrderStatusLabel: Record<string, string> = {
  DRAFT: "草稿",
  CONFIRMED: "已确认",
  PRODUCTION: "生产中",
  READY_TO_SHIP: "待发货",
  SHIPPED: "已发货",
  COMPLETED: "已完成",
  CANCELLED: "已取消",
};

export const DocumentTypeLabel: Record<string, string> = {
  QUOTE: "报价单",
  CONTRACT: "合同",
  ARTWORK: "设计稿",
  SAMPLE_PHOTO: "样品照片",
  PRODUCT_SPEC: "产品规格",
  PACKING_REQUIREMENT: "包装要求",
  OTHER: "其他",
};

export const DocumentRelatedTypeLabel: Record<string, string> = {
  CUSTOMER: "客户",
  PROJECT: "项目",
  QUOTE: "报价",
  ORDER: "订单",
};

export const InvoiceStatusOptions = Object.entries(InvoiceStatusLabel).map(([value, label]) => ({ value, label }));
export const PaymentMethodOptions = Object.entries(PaymentMethodLabel).map(([value, label]) => ({ value, label }));
export const OrderStatusOptions = Object.entries(OrderStatusLabel).map(([value, label]) => ({ value, label }));
export const DocumentTypeOptions = Object.entries(DocumentTypeLabel).map(([value, label]) => ({ value, label }));
export const DocumentRelatedTypeOptions = Object.entries(DocumentRelatedTypeLabel).map(([value, label]) => ({ value, label }));

// ==================== 状态颜色 ====================

export const CustomerStatusColor: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-700",
  POTENTIAL: "bg-blue-100 text-blue-700",
  INACTIVE: "bg-gray-100 text-gray-700",
  WON: "bg-green-100 text-green-700",
  LOST: "bg-red-100 text-red-700",
  BLACKLIST: "bg-gray-800 text-white",
};

export const ProjectStatusColor: Record<string, string> = {
  REQUIREMENT_CONFIRMING: "bg-blue-100 text-blue-700",
  QUOTING: "bg-purple-100 text-purple-700",
  SAMPLE_TESTING: "bg-orange-100 text-orange-700",
  WAITING_FEEDBACK: "bg-yellow-100 text-yellow-700",
  NEGOTIATING: "bg-blue-100 text-blue-700",
  WON: "bg-green-100 text-green-700",
  LOST: "bg-red-100 text-red-700",
  PAUSED: "bg-gray-100 text-gray-700",
};

export const QuoteStatusColor: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700",
  SENT: "bg-blue-100 text-blue-700",
  WAITING_FEEDBACK: "bg-yellow-100 text-yellow-700",
  REVISED: "bg-purple-100 text-purple-700",
  ACCEPTED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
  EXPIRED: "bg-gray-100 text-gray-700",
};

export const TaskPriorityColor: Record<string, string> = {
  LOW: "bg-gray-100 text-gray-700",
  MEDIUM: "bg-blue-100 text-blue-700",
  HIGH: "bg-orange-100 text-orange-700",
  URGENT: "bg-red-100 text-red-700",
};
