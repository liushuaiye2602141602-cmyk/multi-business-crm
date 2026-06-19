"use client";

import { useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { Eye, Pencil, Settings } from "lucide-react";
import OrderColumnSettingsDialog from "@/components/OrderColumnSettingsDialog";
import StatusBadge from "@/components/ui/StatusBadge";
import ConfirmDeleteButton from "@/components/ConfirmDeleteButton";
import {
  ORDER_FIELDS,
  getCustomFieldColumns,
  getDefaultColumnConfig,
  type ColumnConfig,
  type FieldDefinition,
} from "@/lib/order-list/field-registry";
import { OrderStatusLabel } from "@/lib/enums";
import { formatDate, formatDateTime, formatMoney } from "@/lib/format";
import { getOrderStatusVariant } from "@/components/ui/StatusBadge";

interface OrderRow {
  id: number;
  orderNo: string;
  orderTitle: string | null;
  orderStatus: string;
  totalAmount: any;
  currency: string;
  subtotal: any;
  discountAmount: any;
  taxAmount: any;
  chargeAmount: any;
  paidAmount: any;
  outstandingAmount: any;
  costAmount: any;
  grossProfitAmount: any;
  grossProfitRate: any;
  paymentTerm: string | null;
  paymentMethod: string | null;
  deliveryTerm: string | null;
  priceTerm: string | null;
  shippingAddress: string | null;
  expectedDeliveryDate: Date | string | null;
  actualDeliveryDate: Date | string | null;
  ownerName: string | null;
  exchangeRate: any;
  isArchived: boolean;
  notes: string | null;
  updatedAt: Date | string | null;
  createdAt: Date | string | null;
  customerId: number;
  customer?: { id: number; company: string };
  businessLine?: { id: number; name: string } | null;
  project?: { id: number; name: string } | null;
  quote?: { id: number; quoteNo: string } | null;
  contact?: { id: number; name: string } | null;
  [key: string]: any;
}

interface OrderListClientProps {
  orders: OrderRow[];
  initialColumnConfig: ColumnConfig[];
  customFieldDefs: Array<{ id: number; key: string; label: string; fieldType: string }>;
  onDelete?: (id: number) => Promise<any>;
}

function renderCellValue(field: FieldDefinition, order: OrderRow, currency: string): React.ReactNode {
  if (field.key === "customerName") {
    return order.customer?.company || "-";
  }
  if (field.key === "businessLineName") {
    return order.businessLine?.name || "-";
  }
  if (field.key === "projectName") {
    return order.project?.name || "-";
  }
  if (field.key === "quoteNo") {
    return order.quote?.quoteNo || "-";
  }
  if (field.key === "contactName") {
    return order.contact?.name || "-";
  }

  const val = order[field.key];
  if (val === null || val === undefined) return "-";

  switch (field.dataType) {
    case "datetime":
      return formatDateTime(val);
    case "date":
      return formatDate(val);
    case "currency":
      return formatMoney(val, currency);
    case "checkbox":
      return val ? "是" : "否";
    case "number":
      if (field.key === "grossProfitRate") {
        return `${Number(val).toFixed(2)}%`;
      }
      return String(val);
    default:
      return String(val);
  }
}

export default function OrderListClient({
  orders,
  initialColumnConfig,
  customFieldDefs,
  onDelete,
}: OrderListClientProps) {
  const [config, setConfig] = useState<ColumnConfig[]>(initialColumnConfig);
  const [dialogOpen, setDialogOpen] = useState(false);

  const allFields = useMemo(() => {
    const base = [...ORDER_FIELDS];
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
            {orders.map((order) => (
              <tr key={order.id} className={`hover:bg-gray-50 transition-colors ${order.isArchived ? "opacity-50" : ""}`}>
                {visibleColumns.map(col => {
                  const field = col.field!;
                  const frozenStyle = col.frozen ? "sticky left-0 z-10 bg-white group-hover:bg-gray-50" : "";
                  return (
                    <td
                      key={col.key}
                      className={`py-3 px-4 ${getTextAlign(field.align)} text-gray-600 ${frozenStyle}`}
                      style={{ minWidth: col.width }}
                    >
                      {field.key === "orderNo" ? (
                        <Link href={`/orders/${order.id}`} className="font-medium text-gray-900 hover:text-blue-600">
                          {order.orderNo}
                        </Link>
                      ) : field.key === "customerName" ? (
                        order.customer ? (
                          <Link href={`/customers/${order.customer.id}`} className="text-gray-600 hover:text-blue-600">
                            {order.customer.company}
                          </Link>
                        ) : "-"
                      ) : field.key === "orderStatus" ? (
                        <StatusBadge label={OrderStatusLabel[order.orderStatus] || order.orderStatus} variant={getOrderStatusVariant(order.orderStatus)} />
                      ) : field.key === "updatedAt" ? (
                        formatDate(order.updatedAt)
                      ) : field.key === "createdAt" ? (
                        formatDate(order.createdAt)
                      ) : (
                        renderCellValue(field, order, order.currency)
                      )}
                    </td>
                  );
                })}
                <td className="py-3 px-4 sticky right-0 bg-white group-hover:bg-gray-50 z-10">
                  <div className="flex items-center justify-end gap-1">
                    <Link href={`/orders/${order.id}`} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors">
                      <Eye size={16} />
                    </Link>
                    <Link href={`/orders/${order.id}/edit`} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors">
                      <Pencil size={16} />
                    </Link>
                    {onDelete && <ConfirmDeleteButton action={() => onDelete(order.id)} />}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <OrderColumnSettingsDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        columnConfig={config}
        onSave={handleSave}
        customFieldDefs={customFieldDefs}
      />
    </>
  );
}
