import Link from "next/link";
import { ArrowLeft, Plus } from "lucide-react";
import { ReactNode } from "react";

interface PageHeaderAction {
  label: string;
  href: string;
  icon?: ReactNode;
}

interface PageHeaderProps {
  title: string;
  description?: string;
  backHref?: string;
  action?: PageHeaderAction;
  actions?: ReactNode;
}

export default function PageHeader({ title, description, backHref, action, actions }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-3">
        {backHref && (
          <Link
            href={backHref}
            className="p-2 text-gray-400 hover:text-gray-700 hover:bg-white rounded-xl transition-all border border-transparent hover:border-gray-200 hover:shadow-sm"
          >
            <ArrowLeft size={18} />
          </Link>
        )}
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{title}</h1>
          {description && <p className="text-sm text-gray-500 mt-1">{description}</p>}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {action && (
          <Link
            href={action.href}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold gradient-accent text-white hover:opacity-90 transition-opacity shadow-md shadow-blue-500/20"
          >
            {action.icon || <Plus size={16} />}
            {action.label}
          </Link>
        )}
        {actions}
      </div>
    </div>
  );
}
