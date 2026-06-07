import { ReactNode } from "react";
import Link from "next/link";
import { Plus, Inbox } from "lucide-react";

interface EmptyStateProps {
  message: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
  icon?: ReactNode;
}

export default function EmptyState({
  message,
  description,
  actionLabel,
  actionHref,
  icon,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      {icon || <Inbox size={48} className="text-gray-300 mb-4" />}
      <h3 className="text-base font-medium text-gray-900 mb-1">{message}</h3>
      {description && <p className="text-sm text-gray-500 mb-6 max-w-md text-center">{description}</p>}
      {actionLabel && actionHref && (
        <Link
          href={actionHref}
          className="inline-flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
        >
          <Plus size={16} />
          {actionLabel}
        </Link>
      )}
    </div>
  );
}
