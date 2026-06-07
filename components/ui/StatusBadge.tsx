interface StatusBadgeProps {
  label: string;
  variant?: "default" | "success" | "warning" | "danger" | "info" | "purple";
  size?: "sm" | "md";
}

const variantStyles: Record<string, string> = {
  default: "bg-gray-100 text-gray-700 border border-gray-200",
  success: "bg-green-50 text-green-700 border border-green-200",
  warning: "bg-yellow-50 text-yellow-700 border border-yellow-200",
  danger: "bg-red-50 text-red-700 border border-red-200",
  info: "bg-blue-50 text-blue-700 border border-blue-200",
  purple: "bg-purple-50 text-purple-700 border border-purple-200",
};

export default function StatusBadge({ label, variant = "default", size = "sm" }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full font-medium whitespace-nowrap ${
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-sm"
      } ${variantStyles[variant]}`}
    >
      {label}
    </span>
  );
}

// 状态颜色映射工具函数
export function getLeadStatusVariant(status: string): "info" | "purple" | "success" | "danger" | "default" {
  const map: Record<string, "info" | "purple" | "success" | "danger" | "default"> = {
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

export function getLeadGradeVariant(grade: string): "success" | "info" | "warning" | "default" {
  const map: Record<string, "success" | "info" | "warning" | "default"> = {
    A: "success",
    B: "info",
    C: "warning",
    D: "default",
  };
  return map[grade] || "default";
}

export function getProjectStatusVariant(status: string): "info" | "purple" | "warning" | "success" | "danger" | "default" {
  const map: Record<string, "info" | "purple" | "warning" | "success" | "danger" | "default"> = {
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

export function getQuoteStatusVariant(status: string): "default" | "info" | "warning" | "purple" | "success" | "danger" {
  const map: Record<string, "default" | "info" | "warning" | "purple" | "success" | "danger"> = {
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

export function getTaskStatusVariant(status: string): "info" | "warning" | "success" | "default" {
  const map: Record<string, "info" | "warning" | "success" | "default"> = {
    PENDING: "info",
    IN_PROGRESS: "warning",
    COMPLETED: "success",
    CANCELLED: "default",
  };
  return map[status] || "default";
}

export function getTaskPriorityVariant(priority: string): "default" | "info" | "warning" | "danger" {
  const map: Record<string, "default" | "info" | "warning" | "danger"> = {
    LOW: "default",
    MEDIUM: "info",
    HIGH: "warning",
    URGENT: "danger",
  };
  return map[priority] || "default";
}

export function getWebhookStatusVariant(status: string): "success" | "danger" | "warning" | "default" {
  const map: Record<string, "success" | "danger" | "warning" | "default"> = {
    SUCCESS: "success",
    FAILED: "danger",
    UNAUTHORIZED: "danger",
    DUPLICATE: "warning",
    VALIDATION_ERROR: "warning",
  };
  return map[status] || "default";
}

export function getCustomerStatusVariant(status: string): "success" | "info" | "default" | "danger" {
  const map: Record<string, "success" | "info" | "default" | "danger"> = {
    ACTIVE: "success",
    POTENTIAL: "info",
    INACTIVE: "default",
    WON: "success",
    LOST: "danger",
    BLACKLIST: "danger",
  };
  return map[status] || "default";
}

export function getOrderStatusVariant(status: string): "default" | "info" | "warning" | "success" | "danger" {
  const map: Record<string, "default" | "info" | "warning" | "success" | "danger"> = {
    DRAFT: "default",
    CONFIRMED: "info",
    PRODUCTION: "warning",
    READY_TO_SHIP: "warning",
    SHIPPED: "info",
    COMPLETED: "success",
    CANCELLED: "danger",
  };
  return map[status] || "default";
}
