import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { PRESET_SEGMENTS } from "@/lib/customer-segments/preset-segments";
import SegmentCardClient from "./SegmentCardClient";

export const dynamic = "force-dynamic";

export default async function SegmentsPage() {
  // Fetch counts for all segments in parallel
  const { getSegmentCount } = await import("@/lib/customer-segments/segment-query-builder");

  const counts = await Promise.all(
    PRESET_SEGMENTS.map(async (segment) => {
      const defaultSettings: Record<string, string> = {};
      for (const s of segment.settings) {
        defaultSettings[s.key] = s.defaultValue;
      }
      const count = await getSegmentCount(segment, defaultSettings);
      return { key: segment.key, count };
    })
  );

  const countMap = new Map(counts.map(c => [c.key, c.count]));

  const categories = [
    { key: "follow_up" as const, title: "跟进管理", description: "管理客户跟进节奏，及时触达" },
    { key: "sales" as const, title: "销售机会", description: "识别高价值客户和商机" },
    { key: "new" as const, title: "新客户", description: "关注新加入的客户" },
  ];

  return (
    <div>
      <PageHeader
        title="客户客群"
        description="预设客户分群，快速筛选和分析不同类型的客户群体"
        backHref="/customers"
      />

      {categories.map((cat) => {
        const segments = PRESET_SEGMENTS.filter(s => s.category === cat.key);
        if (segments.length === 0) return null;

        return (
          <div key={cat.key} className="mb-8">
            <div className="mb-3">
              <h2 className="text-lg font-semibold text-gray-900">{cat.title}</h2>
              <p className="text-sm text-gray-500">{cat.description}</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {segments.map((segment) => (
                <SegmentCardClient
                  key={segment.key}
                  segment={segment}
                  count={countMap.get(segment.key) ?? 0}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
