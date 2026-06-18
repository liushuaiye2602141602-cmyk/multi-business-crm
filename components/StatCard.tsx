import Link from "next/link";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: number | string;
  icon: LucideIcon;
  color?: string;
  bg?: string;
  href?: string;
}

export default function StatCard({
  label,
  value,
  icon: Icon,
  color = "text-blue-600",
  bg = "bg-blue-50",
  href,
}: StatCardProps) {
  const content = (
    <div className="card p-4 hover:shadow-lg transition-all duration-200 group cursor-default">
      <div className="flex items-center gap-3">
        <div className={`p-2.5 rounded-xl ${bg} group-hover:scale-105 transition-transform`}>
          <Icon size={20} className={color} />
        </div>
        <div>
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">{label}</p>
          <p className="text-2xl font-bold text-gray-900 mt-0.5 tabular-nums">{value}</p>
        </div>
      </div>
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }
  return content;
}
