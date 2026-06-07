import { ReactNode } from "react";

interface DetailFieldProps {
  label: string;
  value: ReactNode;
  className?: string;
}

export default function DetailField({ label, value, className = "" }: DetailFieldProps) {
  return (
    <div className={`flex items-start justify-between py-3 ${className}`}>
      <span className="text-sm text-gray-500 min-w-[120px]">{label}</span>
      <span className="text-sm font-medium text-gray-900 text-right flex-1 ml-4">{value || "-"}</span>
    </div>
  );
}

interface DetailSectionProps {
  title: string;
  children: ReactNode;
  action?: ReactNode;
}

export function DetailSection({ title, children, action }: DetailSectionProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
        <h3 className="text-base font-semibold text-gray-900">{title}</h3>
        {action}
      </div>
      <div className="divide-y divide-gray-100">{children}</div>
    </div>
  );
}
