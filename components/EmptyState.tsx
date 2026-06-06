import Link from "next/link";
import { Plus } from "lucide-react";

interface EmptyStateProps {
  message: string;
  actionLabel?: string;
  actionHref?: string;
}

export default function EmptyState({ message, actionLabel, actionHref }: EmptyStateProps) {
  return (
    <div className="py-12 text-center">
      <p className="text-gray-400 mb-4">{message}</p>
      {actionLabel && actionHref && (
        <Link
          href={actionHref}
          className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={16} />
          {actionLabel}
        </Link>
      )}
    </div>
  );
}
