"use client";

import Link from "next/link";

interface SegmentData {
  key: string;
  label: string;
  description: string;
  category: string;
  icon: string;
  settings: Array<{ key: string; label: string; options: Array<{ value: string; label: string }>; defaultValue: string }>;
}

interface SegmentCardClientProps {
  segment: SegmentData;
  count: number;
}

const categoryColors: Record<string, string> = {
  follow_up: "bg-blue-50 border-blue-200 hover:border-blue-300",
  sales: "bg-amber-50 border-amber-200 hover:border-amber-300",
  new: "bg-emerald-50 border-emerald-200 hover:border-emerald-300",
};

const countColors: Record<string, string> = {
  follow_up: "text-blue-600",
  sales: "text-amber-600",
  new: "text-emerald-600",
};

export default function SegmentCardClient({ segment, count }: SegmentCardClientProps) {
  const colorClass = categoryColors[segment.category] || "bg-gray-50 border-gray-200 hover:border-gray-300";
  const countColor = countColors[segment.category] || "text-gray-600";

  return (
    <Link
      href={`/customers/segments/${segment.key}`}
      className={`block rounded-xl border p-5 transition-all hover:shadow-md ${colorClass}`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{segment.icon}</span>
          <h3 className="text-base font-semibold text-gray-900">{segment.label}</h3>
        </div>
        <span className={`text-2xl font-bold ${countColor}`}>
          {count}
        </span>
      </div>
      <p className="text-sm text-gray-600 mb-3">{segment.description}</p>
      {segment.settings.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {segment.settings.map((s) => (
            <span key={s.key} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-white/80 text-gray-600 border border-gray-200">
              {s.label}
            </span>
          ))}
        </div>
      )}
    </Link>
  );
}
