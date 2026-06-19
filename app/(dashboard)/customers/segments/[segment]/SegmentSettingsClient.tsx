"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import type { PresetSegment } from "@/lib/customer-segments/preset-segments";

interface SegmentSettingsClientProps {
  segment: PresetSegment;
  currentSettings: Record<string, string>;
}

export default function SegmentSettingsClient({ segment, currentSettings }: SegmentSettingsClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleSettingChange = useCallback((key: string, value: string) => {
    const sp = new URLSearchParams(searchParams.toString());
    sp.set(key, value);
    sp.delete("page"); // Reset to page 1 when settings change
    router.push(`/customers/segments/${segment.key}?${sp.toString()}`);
  }, [router, searchParams, segment.key]);

  return (
    <div className="flex flex-wrap items-center gap-4 mb-4 p-4 bg-white rounded-xl border border-gray-200">
      {segment.settings.map((setting) => (
        <div key={setting.key} className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">{setting.label}</label>
          <select
            value={currentSettings[setting.key] || setting.defaultValue}
            onChange={(e) => handleSettingChange(setting.key, e.target.value)}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {setting.options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      ))}
    </div>
  );
}
