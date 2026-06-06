import Link from "next/link";
import { ArrowLeft, Plus } from "lucide-react";

interface PageHeaderProps {
  title: string;
  backHref?: string;
  action?: {
    label: string;
    href: string;
    icon?: React.ReactNode;
  };
}

export default function PageHeader({ title, backHref, action }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-4">
        {backHref && (
          <Link href={backHref} className="text-gray-400 hover:text-gray-600">
            <ArrowLeft size={20} />
          </Link>
        )}
        <h1 className="text-2xl font-bold">{title}</h1>
      </div>
      {action && (
        <Link
          href={action.href}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          {action.icon || <Plus size={16} />}
          {action.label}
        </Link>
      )}
    </div>
  );
}
