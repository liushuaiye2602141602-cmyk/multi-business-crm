import { ReactNode } from "react";

interface DetailFieldProps {
  label: string;
  value: ReactNode;
  className?: string;
}

export default function DetailField({ label, value, className = "" }: DetailFieldProps) {
  return (
    <div className={`flex justify-between py-2 ${className}`}>
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm font-medium text-gray-900">{value || "-"}</span>
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
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        {action}
      </div>
      <div className="divide-y divide-gray-100">{children}</div>
    </div>
  );
}
