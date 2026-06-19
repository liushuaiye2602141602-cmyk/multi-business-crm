import Link from "next/link";
import prisma from "@/lib/prisma";
import { Plus, Download, Anchor } from "lucide-react";
import { deleteCustomer } from "./actions";
import { CustomerStatusLabel, CustomerTypeLabel, LeadSourceLabel, CustomerStageLabel, PurchaseIntentLabel } from "@/lib/enums";
import PageHeader from "@/components/PageHeader";
import Card from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import CsvImportButton from "@/components/CsvImportButton";
import SearchFilterBar from "@/components/SearchFilterBar";
import CustomerListClient from "@/components/CustomerListClient";
import { getDefaultColumnConfig } from "@/lib/customer-list/field-registry";
import type { ColumnConfig } from "@/lib/customer-list/field-registry";

export const dynamic = "force-dynamic";

const PAGE_SIZE_OPTIONS = [10, 20, 50];

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const search = typeof params.search === "string" ? params.search : "";
  const businessLineId = typeof params.businessLineId === "string" ? params.businessLineId : "";
  const customerType = typeof params.customerType === "string" ? params.customerType : "";
  const customerStatus = typeof params.customerStatus === "string" ? params.customerStatus : "";
  const source = typeof params.source === "string" ? params.source : "";
  const ownerView = typeof params.ownerView === "string" ? params.ownerView : "";
  const stage = typeof params.stage === "string" ? params.stage : "";
  const purchaseIntent = typeof params.purchaseIntent === "string" ? params.purchaseIntent : "";
  const country = typeof params.country === "string" ? params.country : "";
  const isArchived = typeof params.isArchived === "string" ? params.isArchived : "";
  const sortBy = typeof params.sortBy === "string" ? params.sortBy : "updatedAt";
  const sortOrder = (typeof params.sortOrder === "string" && params.sortOrder === "asc") ? "asc" : "desc";
  const page = Math.max(1, parseInt(typeof params.page === "string" ? params.page : "1", 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(typeof params.pageSize === "string" ? params.pageSize : "20", 10) || 20));

  const where: Record<string, unknown> = {};
  if (search) {
    where.OR = [
      { company: { contains: search, mode: "insensitive" } },
      { contactName: { contains: search, mode: "insensitive" } },
      { country: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
      { whatsapp: { contains: search, mode: "insensitive" } },
      { remark: { contains: search, mode: "insensitive" } },
      { tags: { has: search } },
    ];
  }
  if (businessLineId) where.businessLineId = parseInt(businessLineId);
  if (customerType) where.customerType = customerType;
  if (customerStatus) where.customerStatus = customerStatus;
  if (source) where.source = source;
  if (stage) where.stage = stage;
  if (purchaseIntent) where.purchaseIntent = purchaseIntent;
  if (country) where.country = { contains: country, mode: "insensitive" };
  if (ownerView === "mine") where.ownerId = 1;
  if (isArchived === "true") where.isArchived = true;
  else if (isArchived === "false") where.isArchived = false;

  // Validate sortBy to prevent injection
  const allowedSortFields = ["createdAt", "updatedAt", "company", "contactName", "country", "stage", "purchaseIntent", "rating", "dealProbability", "lastContactAt", "nextFollowUpAt"];
  const finalSortBy = allowedSortFields.includes(sortBy) ? sortBy : "updatedAt";

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

  const [customers, businessLines, totalCount] = await Promise.all([
    prisma.customer.findMany({
      where,
      orderBy: { [finalSortBy]: sortOrder },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        businessLine: true,
        _count: { select: { projects: true, contacts: true } },
        contacts: {
          where: { isPrimary: true },
          take: 1,
        },
      },
    }),
    prisma.businessLine.findMany({ orderBy: { name: "asc" } }),
    prisma.customer.count({ where }),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  const hasFilters = search || businessLineId || customerType || customerStatus || source || ownerView || stage || purchaseIntent || country || isArchived;

  // Build URL for pagination
  function buildPageUrl(targetPage: number) {
    const sp = new URLSearchParams();
    if (search) sp.set("search", search);
    if (businessLineId) sp.set("businessLineId", businessLineId);
    if (customerType) sp.set("customerType", customerType);
    if (customerStatus) sp.set("customerStatus", customerStatus);
    if (source) sp.set("source", source);
    if (ownerView) sp.set("ownerView", ownerView);
    if (stage) sp.set("stage", stage);
    if (purchaseIntent) sp.set("purchaseIntent", purchaseIntent);
    if (country) sp.set("country", country);
    if (isArchived) sp.set("isArchived", isArchived);
    if (sortBy !== "updatedAt") sp.set("sortBy", sortBy);
    if (sortOrder !== "desc") sp.set("sortOrder", sortOrder);
    sp.set("page", String(targetPage));
    sp.set("pageSize", String(pageSize));
    return `/customers?${sp.toString()}`;
  }

  return (
    <div>
      <PageHeader
        title="客户库"
        description="沉淀有效客户资料，查看客户项目、跟进、报价和 AI 复盘"
        actions={
          <>
            <Link href="/customers/pool" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border border-orange-300 text-orange-700 bg-orange-50 hover:bg-orange-100 transition-colors">
              <Anchor size={16} />
              公海
            </Link>
            <CsvImportButton importUrl="/api/import/customers" label="导入 CSV" />
            <a href="/api/export/customers" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors">
              <Download size={16} />
              导出 CSV
            </a>
            <Link href="/customers/new" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors">
              <Plus size={16} />
              新增客户
            </Link>
          </>
        }
      />

      <SearchFilterBar
        searchPlaceholder="搜索公司、联系人、国家、邮箱、WhatsApp、标签..."
        filters={[
          { name: "businessLineId", label: "业务线", options: businessLines.map((bl) => ({ value: String(bl.id), label: bl.name })) },
          { name: "customerType", label: "客户类型", options: Object.entries(CustomerTypeLabel).map(([value, label]) => ({ value, label })) },
          { name: "customerStatus", label: "客户状态", options: Object.entries(CustomerStatusLabel).map(([value, label]) => ({ value, label })) },
          { name: "stage", label: "销售阶段", options: Object.entries(CustomerStageLabel).map(([value, label]) => ({ value, label })) },
          { name: "purchaseIntent", label: "购买意向", options: Object.entries(PurchaseIntentLabel).map(([value, label]) => ({ value, label })) },
          { name: "source", label: "来源渠道", options: Object.entries(LeadSourceLabel).map(([value, label]) => ({ value, label })) },
          { name: "ownerView", label: "客户归属", options: [{ value: "mine", label: "我的客户" }, { value: "", label: "全部客户" }] },
          { name: "isArchived", label: "归档状态", options: [{ value: "false", label: "未归档" }, { value: "true", label: "已归档" }, { value: "", label: "全部" }] },
        ]}
        defaultSearch={search}
        defaultFilters={{ businessLineId, customerType, customerStatus, source, ownerView, stage, purchaseIntent, isArchived }}
      />

      {/* Pagination summary */}
      <div className="flex items-center justify-between mb-3 text-sm text-gray-500">
        <span>共 {totalCount} 条记录，第 {page}/{totalPages} 页</span>
        <span className="text-xs text-gray-400">
          按 {finalSortBy} {sortOrder === "asc" ? "升序" : "降序"} 排列
          {" "}
          ({pageSize}条/页)
        </span>
      </div>

      <Card padding="none">
        {customers.length === 0 ? (
          <EmptyState
            message={hasFilters ? "没有找到匹配的客户" : "暂无客户"}
            description={hasFilters ? "请调整筛选条件" : "点击右上角新增客户开始记录"}
            actionLabel={hasFilters ? undefined : "新增客户"}
            actionHref={hasFilters ? undefined : "/customers/new"}
          />
        ) : (
          <CustomerListClient
            customers={customers as any}
            initialColumnConfig={columnConfig}
            customFieldDefs={customFieldDefs}
            onDelete={deleteCustomer}
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
