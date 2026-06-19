"use client";

import { useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { Eye, Pencil, Settings } from "lucide-react";
import ColumnSettingsDialog from "@/components/ColumnSettingsDialog";
import StatusBadge from "@/components/ui/StatusBadge";
import ConfirmDeleteButton from "@/components/ConfirmDeleteButton";
import {
  CUSTOMER_FIELDS,
  getCustomFieldColumns,
  getDefaultColumnConfig,
  type ColumnConfig,
  type FieldDefinition,
} from "@/lib/customer-list/field-registry";
import { CustomerStageLabel, PurchaseIntentLabel } from "@/lib/enums";
import { formatDate, formatDateTime, formatMoney } from "@/lib/format";

interface CustomerRow {
  id: number;
  company: string;
  contactName: string;
  country: string | null;
  phone: string | null;
  email: string | null;
  whatsapp: string | null;
  website: string | null;
  industry: string | null;
  customerType: string;
  customerStatus: string;
  rating: number | null;
  tags: string[];
  stage: string;
  purchaseIntent: string;
  dealProbability: number | null;
  expectedDealValue: any;
  ownerName: string | null;
  lastContactAt: Date | string | null;
  nextFollowUpAt: Date | string | null;
  updatedAt: Date | string | null;
  createdAt: Date | string | null;
  isArchived: boolean;
  shortName: string | null;
  customCode: string | null;
  region: string | null;
  city: string | null;
  companySize: string | null;
  source: string | null;
  notes: string | null;
  expectedCloseDate: Date | string | null;
  _count: { projects: number; contacts: number };
  contacts?: Array<{ name: string; email: string | null; phone: string | null; isPrimary: boolean; jobTitle?: string | null }>;
  [key: string]: any;
}

interface CustomerListClientProps {
  customers: CustomerRow[];
  initialColumnConfig: ColumnConfig[];
  customFieldDefs: Array<{ id: number; key: string; label: string; fieldType: string }>;
  onDelete: (id: number) => Promise<void>;
}

function getCustomerStageVariant(stage: string): "success" | "warning" | "danger" | "info" | "default" {
  switch (stage) {
    case "WON": return "success";
    case "NEGOTIATION":
    case "PROPOSAL": return "warning";
    case "LOST": return "danger";
    case "QUALIFIED":
    case "CONTACTED": return "info";
    default: return "default";
  }
}

function getPurchaseIntentVariant(intent: string): "success" | "warning" | "danger" | "info" | "default" {
  switch (intent) {
    case "HIGH": return "success";
    case "MEDIUM": return "warning";
    case "LOW": return "danger";
    default: return "default";
  }
}

function renderCellValue(field: FieldDefinition, customer: CustomerRow): React.ReactNode {
  const val = customer[field.key];

  if (field.key === "primaryContactName") {
    const primary = customer.contacts?.find((c: any) => c.isPrimary) || customer.contacts?.[0];
    return primary?.name || customer.contactName || "-";
  }
  if (field.key === "primaryContactEmail") {
    const primary = customer.contacts?.find((c: any) => c.isPrimary) || customer.contacts?.[0];
    return primary?.email || customer.email || "-";
  }
  if (field.key === "primaryContactPhone") {
    const primary = customer.contacts?.find((c: any) => c.isPrimary) || customer.contacts?.[0];
    return primary?.phone || customer.phone || "-";
  }
  if (field.key === "primaryContactJobTitle") {
    const primary = customer.contacts?.find((c: any) => c.isPrimary) || customer.contacts?.[0];
    return (primary as any)?.jobTitle || "-";
  }
  if (field.key === "contactCount") {
    return customer._count?.contacts ?? 0;
  }

  if (field.key.startsWith("custom:")) {
    const customKey = field.key.replace("custom:", "");
    const customValues = customer.customValues as Array<{ fieldDefinitionId: number; value: string | null }> | undefined;
    const cv = customValues?.find((v) => String(v.fieldDefinitionId) === customKey);
    return cv?.value || "-";
  }

  if (val === null || val === undefined) return "-";

  switch (field.dataType) {
    case "datetime":
      return formatDateTime(val);
    case "date":
      return formatDate(val);
    case "currency":
      return formatMoney(val);
    case "rating":
      return <span className="text-amber-500">{"★".repeat(Math.min(val as number, 5))}</span>;
    case "tags":
      if (Array.isArray(val) && val.length > 0) {
        return (
          <div className="flex gap-1 flex-wrap">
            {val.slice(0, 3).map((tag: string) => (
              <span key={tag} className="inline-block px-1.5 py-0.5 text-[10px] bg-gray-100 text-gray-600 rounded">
                {tag}
              </span>
            ))}
          </div>
        );
      }
      return "-";
    case "checkbox":
      return val ? "是" : "否";
    case "url":
      return val ? (
        <a href={val as string} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline truncate block max-w-full">
          {val as string}
        </a>
      ) : "-";
    case "email":
      return val ? (
        <a href={`mailto:${val}`} className="text-blue-600 hover:underline">
          {val as string}
        </a>
      ) : "-";
    case "phone":
      return val ? (
        <a href={`tel:${val}`} className="text-blue-600 hover:underline">
          {val as string}
        </a>
      ) : "-";
    default:
      return String(val);
  }
}

export default function CustomerListClient({
  customers,
  initialColumnConfig,
  customFieldDefs,
  onDelete,
}: CustomerListClientProps) {
  const [config, setConfig] = useState<ColumnConfig[]>(initialColumnConfig);
  const [dialogOpen, setDialogOpen] = useState(false);

  const allFields = useMemo(() => {
    const base = [...CUSTOMER_FIELDS];
    if (customFieldDefs.length > 0) {
      base.push(...getCustomFieldColumns(customFieldDefs));
    }
    return base;
  }, [customFieldDefs]);

  const visibleColumns = useMemo(() => {
    return config
      .filter(c => c.visible)
      .sort((a, b) => a.order - b.order)
      .map(c => {
        const field = allFields.find(f => f.key === c.key);
        return { ...c, field };
      })
      .filter(c => c.field);
  }, [config, allFields]);

  const frozenColumns = visibleColumns.filter(c => c.frozen);
  const normalColumns = visibleColumns.filter(c => !c.frozen);

  const handleSave = useCallback((newConfig: ColumnConfig[]) => {
    setConfig(newConfig);
  }, []);

  const getTextAlign = (align: string) => {
    switch (align) {
      case "center": return "text-center";
      case "right": return "text-right";
      default: return "text-left";
    }
  };

  return (
    <>
      <div className="flex items-center justify-between mb-3">
        <div />
        <button
          onClick={() => setDialogOpen(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <Settings size={14} />
          显示设置
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              {visibleColumns.map(col => {
                const field = col.field!;
                const frozenStyle = col.frozen ? "sticky left-0 z-10 bg-gray-50" : "";
                return (
                  <th
                    key={col.key}
                    className={`${getTextAlign(field.align)} py-3 px-4 font-medium text-gray-600 text-xs uppercase tracking-wider ${frozenStyle}`}
                    style={{ minWidth: col.width }}
                  >
                    {field.label}
                  </th>
                );
              })}
              <th className="text-right py-3 px-4 font-medium text-gray-600 text-xs uppercase tracking-wider sticky right-0 bg-gray-50 z-10">
                操作
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {customers.map((customer) => (
              <tr key={customer.id} className={`hover:bg-gray-50 transition-colors ${customer.isArchived ? "opacity-50" : ""}`}>
                {visibleColumns.map(col => {
                  const field = col.field!;
                  const frozenStyle = col.frozen ? "sticky left-0 z-10 bg-white group-hover:bg-gray-50" : "";
                  return (
                    <td
                      key={col.key}
                      className={`py-3 px-4 ${getTextAlign(field.align)} text-gray-600 ${frozenStyle}`}
                      style={{ minWidth: col.width }}
                    >
                      {field.key === "name" ? (
                        <Link href={`/customers/${customer.id}`} className="font-medium text-gray-900 hover:text-blue-600">
                          {customer.company}
                        </Link>
                      ) : field.key === "stage" ? (
                        <StatusBadge label={CustomerStageLabel[customer.stage] || customer.stage} variant={getCustomerStageVariant(customer.stage)} />
                      ) : field.key === "purchaseIntent" ? (
                        <StatusBadge label={PurchaseIntentLabel[customer.purchaseIntent] || customer.purchaseIntent} variant={getPurchaseIntentVariant(customer.purchaseIntent)} />
                      ) : field.key === "updatedAt" ? (
                        formatDate(customer.updatedAt)
                      ) : (
                        renderCellValue(field, customer)
                      )}
                    </td>
                  );
                })}
                <td className="py-3 px-4 sticky right-0 bg-white group-hover:bg-gray-50 z-10">
                  <div className="flex items-center justify-end gap-1">
                    <Link href={`/customers/${customer.id}`} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors">
                      <Eye size={16} />
                    </Link>
                    <Link href={`/customers/${customer.id}/edit`} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors">
                      <Pencil size={16} />
                    </Link>
                    <ConfirmDeleteButton action={async () => { "use server"; await onDelete(customer.id); }} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ColumnSettingsDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        columnConfig={config}
        onSave={handleSave}
        customFieldDefs={customFieldDefs}
      />
    </>
  );
}
