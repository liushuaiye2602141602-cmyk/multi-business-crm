interface StatusBadgeProps {
  label: string;
  variant?: "default" | "success" | "warning" | "danger" | "info" | "purple";
  size?: "sm" | "md";
}

const variantStyles: Record<string, string> = {
  default: "bg-gray-100 text-gray-700",
  success: "bg-green-100 text-green-700",
  warning: "bg-yellow-100 text-yellow-700",
  danger: "bg-red-100 text-red-700",
  info: "bg-blue-100 text-blue-700",
  purple: "bg-purple-100 text-purple-700",
};

export default function StatusBadge({ label, variant = "default", size = "sm" }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full font-medium ${
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm"
      } ${variantStyles[variant]}`}
    >
      {label}
    </span>
  );
}

// 状态颜色映射工具函数
export function getLeadStatusVariant(status: string): string {
  const map: Record<string, string> = {
    NEW: "info",
    CONTACTED: "purple",
    REQUIREMENT_CONFIRMING: "info",
    QUOTING: "info",
    NEGOTIATING: "purple",
    QUALIFIED: "success",
    WON: "success",
    LOST: "danger",
    DORMANT: "default",
  };
  return map[status] || "default";
}

export function getLeadGradeVariant(grade: string): string {
  const map: Record<string, string> = {
    A: "success",
    B: "info",
    C: "warning",
    D: "default",
  };
  return map[grade] || "default";
}

export function getProjectStatusVariant(status: string): string {
  const map: Record<string, string> = {
    REQUIREMENT_CONFIRMING: "info",
    QUOTING: "purple",
    SAMPLE_TESTING: "warning",
    WAITING_FEEDBACK: "warning",
    NEGOTIATING: "purple",
    WON: "success",
    LOST: "danger",
    PAUSED: "default",
  };
  return map[status] || "default";
}

export function getQuoteStatusVariant(status: string): string {
  const map: Record<string, string> = {
    DRAFT: "default",
    SENT: "info",
    WAITING_FEEDBACK: "warning",
    REVISED: "purple",
    ACCEPTED: "success",
    REJECTED: "danger",
    EXPIRED: "default",
  };
  return map[status] || "default";
}

export function getTaskStatusVariant(status: string): string {
  const map: Record<string, string> = {
    PENDING: "info",
    IN_PROGRESS: "warning",
    COMPLETED: "success",
    CANCELLED: "default",
  };
  return map[status] || "default";
}

export function getTaskPriorityVariant(priority: string): string {
  const map: Record<string, string> = {
    LOW: "default",
    MEDIUM: "info",
    HIGH: "warning",
    URGENT: "danger",
  };
  return map[priority] || "default";
}

export function getWebhookStatusVariant(status: string): string {
  const map: Record<string, string> = {
    SUCCESS: "success",
    FAILED: "danger",
    UNAUTHORIZED: "danger",
    DUPLICATE: "warning",
    VALIDATION_ERROR: "warning",
  };
  return map[status] || "default";
}

export function getCustomerStatusVariant(status: string): string {
  const map: Record<string, string> = {
    ACTIVE: "success",
    POTENTIAL: "info",
    INACTIVE: "default",
    WON: "success",
    LOST: "danger",
    BLACKLIST: "danger",
  };
  return map[status] || "default";
}
