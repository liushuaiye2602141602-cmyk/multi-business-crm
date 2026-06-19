export interface PresetSegment {
  key: string;
  label: string;
  description: string;
  category: "follow_up" | "sales" | "new";
  icon: string;
  settings: Array<{ key: string; label: string; options: Array<{ value: string; label: string }>; defaultValue: string }>;
  buildWhere: (settings: Record<string, string>) => any;
  requiresQuoteFilter?: boolean;
  requiresOrderFilter?: boolean;
}

function getTodayRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  return { start, end };
}

function daysAgo(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(0, 0, 0, 0);
  return d;
}

export const PRESET_SEGMENTS: PresetSegment[] = [
  {
    key: "recently_created",
    label: "最近新增客户",
    description: "最近一段时间内新增的客户",
    category: "new",
    icon: "🆕",
    settings: [
      { key: "days", label: "时间范围", options: [{ value: "7", label: "最近 7 天" }, { value: "30", label: "最近 30 天" }, { value: "90", label: "最近 90 天" }], defaultValue: "30" },
    ],
    buildWhere: (s) => ({ createdAt: { gte: daysAgo(parseInt(s.days) || 30) }, isArchived: false }),
  },
  {
    key: "upcoming_follow_up",
    label: "待跟进客户",
    description: "未来需要跟进的客户",
    category: "follow_up",
    icon: "📅",
    settings: [
      { key: "range", label: "时间范围", options: [{ value: "TODAY", label: "今天" }, { value: "NEXT_7_DAYS", label: "未来 7 天" }, { value: "NEXT_30_DAYS", label: "未来 30 天" }], defaultValue: "NEXT_7_DAYS" },
    ],
    buildWhere: (s) => {
      const range = s.range || "NEXT_7_DAYS";
      const { start } = getTodayRange();
      let end: Date;
      if (range === "TODAY") {
        end = new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1);
      } else if (range === "NEXT_30_DAYS") {
        end = new Date(start.getTime() + 30 * 24 * 60 * 60 * 1000 - 1);
      } else {
        end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000 - 1);
      }
      return { nextFollowUpAt: { gte: start, lte: end }, isArchived: false, stage: { notIn: ["LOST"] } };
    },
  },
  {
    key: "overdue_follow_up",
    label: "逾期未跟进客户",
    description: "已过期未跟进的客户",
    category: "follow_up",
    icon: "⚠️",
    settings: [
      { key: "overdue_days", label: "逾期范围", options: [{ value: "0", label: "全部逾期" }, { value: "7", label: "逾期 7 天以上" }, { value: "30", label: "逾期 30 天以上" }], defaultValue: "0" },
    ],
    buildWhere: (s) => {
      const { start } = getTodayRange();
      const overdueDays = parseInt(s.overdue_days) || 0;
      const cutoff = overdueDays > 0 ? daysAgo(overdueDays) : start;
      return { nextFollowUpAt: { lt: cutoff }, isArchived: false, stage: { notIn: ["LOST", "WON"] } };
    },
  },
  {
    key: "high_intent",
    label: "高意向客户",
    description: "采购意向高或成交概率高的客户",
    category: "sales",
    icon: "🔥",
    settings: [
      { key: "threshold", label: "成交概率阈值", options: [{ value: "60", label: "60%" }, { value: "70", label: "70%" }, { value: "80", label: "80%" }], defaultValue: "70" },
    ],
    buildWhere: (s) => {
      const threshold = parseInt(s.threshold) || 70;
      return {
        OR: [{ purchaseIntent: "HIGH" }, { dealProbability: { gte: threshold } }],
        isArchived: false,
        stage: { notIn: ["LOST", "WON"] },
      };
    },
  },
  {
    key: "inactive_customers",
    label: "未联系客户",
    description: "长时间未联系的客户",
    category: "follow_up",
    icon: "😴",
    settings: [
      { key: "days", label: "未联系天数", options: [{ value: "30", label: "30 天" }, { value: "60", label: "60 天" }, { value: "90", label: "90 天" }], defaultValue: "30" },
    ],
    buildWhere: (s) => {
      const days = parseInt(s.days) || 30;
      const cutoff = daysAgo(days);
      return {
        AND: [
          { isArchived: false },
          { stage: { notIn: ["LOST", "WON"] } },
          { OR: [{ lastContactAt: { lt: cutoff } }, { lastContactAt: null, createdAt: { lt: cutoff } }] },
        ],
      };
    },
  },
  {
    key: "quoted_not_won",
    label: "有报价未成交",
    description: "有报价但未成交的客户",
    category: "sales",
    icon: "📋",
    settings: [],
    buildWhere: () => ({
      isArchived: false,
      stage: { notIn: ["LOST", "WON"] },
    }),
    // Special: requires quote relation query
    requiresQuoteFilter: true,
  },
  {
    key: "won_customers",
    label: "已成交客户",
    description: "已成交的客户",
    category: "sales",
    icon: "🏆",
    settings: [],
    buildWhere: () => ({
      OR: [{ stage: "WON" }],
      isArchived: false,
    }),
    // Special: also check for orders
    requiresOrderFilter: true,
  },
];

export function getSegmentByKey(key: string): PresetSegment | undefined {
  return PRESET_SEGMENTS.find(s => s.key === key);
}

export function isValidSegmentKey(key: string): boolean {
  return PRESET_SEGMENTS.some(s => s.key === key);
}
