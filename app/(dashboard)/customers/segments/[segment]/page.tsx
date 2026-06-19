import Link from "next/link";
import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";
import { getSegmentByKey } from "@/lib/customer-segments/preset-segments";
import { getSegmentCustomers } from "@/lib/customer-segments/segment-query-builder";
import PageHeader from "@/components/PageHeader";
import Card from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import CustomerListClient from "@/components/CustomerListClient";
import { getDefaultColumnConfig } from "@/lib/customer-list/field-registry";
import type { ColumnConfig } from "@/lib/customer-list/field-registry";
import SegmentSettingsClient from "./SegmentSettingsClient";

export const dynamic = "force-dynamic";

const PAGE_SIZE_OPTIONS = [10, 20, 50];

export default async function SegmentDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ segment: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { segment: segmentKey } = await params;
  const params2 = await searchParams;

  const segmentData = getSegmentByKey(segmentKey);
  if (!segmentData) {
    notFound();
  }
  const segment = segmentData;

  // Parse settings from search params, falling back to defaults
  const settings: Record<string, string> = {};
  for (const s of segment.settings) {
    const raw = params2[s.key];
    settings[s.key] = typeof raw === "string" ? raw : s.defaultValue;
  }

  const sortBy = typeof params2.sortBy === "string" ? params2.sortBy : "updatedAt";
  const sortOrder = typeof params2.sortOrder === "string" && params2.sortOrder === "asc" ? "asc" : "desc";
  const page = Math.max(1, parseInt(typeof params2.page === "string" ? params2.page : "1", 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(typeof params2.pageSize === "string" ? params2.pageSize : "20", 10) || 20));

  // Fetch default view for column config
  const defaultView = await prisma.customerListView.findFirst({
    where: { isDefault: true },
    orderBy: { createdAt: "asc" },
  });

  const columnConfig: ColumnConfig[] = (defaultView?.columns as any as ColumnConfig[]) || getDefaultColumnConfig();

  // Fetch custom field definitions
  const customFieldDefs = await prisma.customFieldDefinition.findMany({
    where: { entityType: "CUSTOMER", isActive: true },
    orderBy: { sortOrder: "asc" },
    select: { id: true, key: true, label: true, fieldType: true },
  });

  const { customers, total, totalPages } = await getSegmentCustomers(segment, settings, {
    page,
    pageSize,
    orderBy: { [sortBy]: sortOrder },
    include: {
      businessLine: true,
      _count: { select: { projects: true, contacts: true } },
      contacts: {
        where: { isPrimary: true },
        take: 1,
      },
    },
  });

  // Build URL for pagination with settings preserved
  function buildPageUrl(targetPage: number) {
    const sp = new URLSearchParams();
    for (const s of segment.settings) {
      if (settings[s.key] && settings[s.key] !== s.defaultValue) {
        sp.set(s.key, settings[s.key]);
      }
    }
    if (sortBy !== "updatedAt") sp.set("sortBy", sortBy);
    if (sortOrder !== "desc") sp.set("sortOrder", sortOrder);
    sp.set("page", String(targetPage));
    sp.set("pageSize", String(pageSize));
    return `/customers/segments/${segmentKey}?${sp.toString()}`;
  }

  return (
    <div>
      <PageHeader
        title={`${segment.icon} ${segment.label}`}
        description={segment.description}
        backHref="/customers/segments"
      />

      {/* Segment Settings */}
      {segment.settings.length > 0 && (
        <SegmentSettingsClient segment={segment} currentSettings={settings} />
      )}

      {/* Pagination summary */}
      <div className="flex items-center justify-between mb-3 text-sm text-gray-500">
        <span>共 {total} 条记录，第 {page}/{totalPages} 页</span>
        <span className="text-xs text-gray-400">
          按 {sortBy} {sortOrder === "asc" ? "升序" : "降序"} 排列
          {" "}
          ({pageSize}条/页)
        </span>
      </div>

      <Card padding="none">
        {customers.length === 0 ? (
          <EmptyState
            message="该客群暂无客户"
            description="尝试调整筛选条件或查看其他客群"
            actionLabel="返回客群列表"
            actionHref="/customers/segments"
          />
        ) : (
          <CustomerListClient
            customers={customers as any}
            initialColumnConfig={columnConfig}
            customFieldDefs={customFieldDefs}
          />
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <div className="flex items-center gap-2">
              <Link
                href={page > 1 ? buildPageUrl(page - 1) : "#"}
                className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                  page <= 1 ? "border-gray-200 text-gray-300 cursor-not-allowed" : "border-gray-300 text-gray-700 hover:bg-gray-50"
                }`}
              >
                上一页
              </Link>
              <Link
                href={page < totalPages ? buildPageUrl(page + 1) : "#"}
                className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                  page >= totalPages ? "border-gray-200 text-gray-300 cursor-not-allowed" : "border-gray-300 text-gray-700 hover:bg-gray-50"
                }`}
              >
                下一页
              </Link>
            </div>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                let pageNum: number;
                if (totalPages <= 7) {
                  pageNum = i + 1;
                } else if (page <= 4) {
                  pageNum = i + 1;
                } else if (page >= totalPages - 3) {
                  pageNum = totalPages - 6 + i;
                } else {
                  pageNum = page - 3 + i;
                }
                return (
                  <Link
                    key={pageNum}
                    href={buildPageUrl(pageNum)}
                    className={`w-8 h-8 inline-flex items-center justify-center rounded-lg text-sm font-medium transition-colors ${
                      pageNum === page ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    {pageNum}
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
