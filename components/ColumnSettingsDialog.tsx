"use client";

import { useState, useMemo, useCallback } from "react";
import { Settings, Search, X, GripVertical, RotateCcw, Save, ChevronDown, ChevronRight } from "lucide-react";
import {
  CUSTOMER_FIELDS,
  getCustomFieldColumns,
  getDefaultColumnConfig,
  FIELD_CATEGORY_LABELS,
  type FieldDefinition,
  type ColumnConfig,
  type FieldCategory,
} from "@/lib/customer-list/field-registry";

interface ColumnSettingsDialogProps {
  open: boolean;
  onClose: () => void;
  columnConfig: ColumnConfig[];
  onSave: (config: ColumnConfig[]) => void;
  customFieldDefs?: Array<{ id: number; key: string; label: string; fieldType: string }>;
}

export default function ColumnSettingsDialog({
  open,
  onClose,
  columnConfig,
  onSave,
  customFieldDefs = [],
}: ColumnSettingsDialogProps) {
  const allFields = useMemo(() => {
    const base = [...CUSTOMER_FIELDS];
    if (customFieldDefs.length > 0) {
      base.push(...getCustomFieldColumns(customFieldDefs));
    }
    return base;
  }, [customFieldDefs]);

  const [config, setConfig] = useState<ColumnConfig[]>(() => [...columnConfig]);
  const [search, setSearch] = useState("");
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(["COMPANY", "SALES", "CONTACT"]));
  const [draggedKey, setDraggedKey] = useState<string | null>(null);
  const [dragOverKey, setDragOverKey] = useState<string | null>(null);

  const visibleConfig = useMemo(() => config.filter(c => c.visible), [config]);
  const hiddenConfig = useMemo(() => config.filter(c => !c.visible), [config]);

  const searchLower = search.toLowerCase();
  const filteredFields = useMemo(() => {
    if (!searchLower) return allFields;
    return allFields.filter(f =>
      f.label.toLowerCase().includes(searchLower) ||
      f.key.toLowerCase().includes(searchLower)
    );
  }, [allFields, searchLower]);

  const fieldsByCategory = useMemo(() => {
    const groups: Record<string, FieldDefinition[]> = {};
    for (const field of filteredFields) {
      if (!groups[field.category]) groups[field.category] = [];
      groups[field.category].push(field);
    }
    return groups;
  }, [filteredFields]);

  const toggleCategory = useCallback((cat: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  }, []);

  const toggleField = useCallback((key: string) => {
    setConfig(prev => {
      const idx = prev.findIndex(c => c.key === key);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], visible: !next[idx].visible };
        return next;
      }
      const field = allFields.find(f => f.key === key);
      return [...prev, {
        key,
        visible: true,
        order: prev.length,
        width: field?.defaultWidth || 120,
        frozen: false,
      }];
    });
  }, [allFields]);

  const updateWidth = useCallback((key: string, width: number) => {
    setConfig(prev => prev.map(c => c.key === key ? { ...c, width } : c));
  }, []);

  const toggleFrozen = useCallback((key: string) => {
    setConfig(prev => prev.map(c => {
      if (c.key === key) return { ...c, frozen: !c.frozen };
      return { ...c, frozen: false };
    }));
  }, []);

  const removeColumn = useCallback((key: string) => {
    setConfig(prev => prev.map(c => c.key === key ? { ...c, visible: false } : c));
  }, []);

  const handleReset = useCallback(() => {
    setConfig(getDefaultColumnConfig());
  }, []);

  const handleSave = useCallback(() => {
    const sorted = [...config]
      .filter(c => c.visible)
      .sort((a, b) => a.order - b.order)
      .map((c, i) => ({ ...c, order: i }));
    const hidden = config.filter(c => !c.visible);
    onSave([...sorted, ...hidden]);
    onClose();
  }, [config, onSave, onClose]);

  const handleDragStart = useCallback((key: string) => {
    setDraggedKey(key);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, key: string) => {
    e.preventDefault();
    setDragOverKey(key);
  }, []);

  const handleDrop = useCallback((targetKey: string) => {
    if (!draggedKey || draggedKey === targetKey) {
      setDraggedKey(null);
      setDragOverKey(null);
      return;
    }

    setConfig(prev => {
      const sorted = [...prev].filter(c => c.visible).sort((a, b) => a.order - b.order);
      const fromIdx = sorted.findIndex(c => c.key === draggedKey);
      const toIdx = sorted.findIndex(c => c.key === targetKey);
      if (fromIdx < 0 || toIdx < 0) return prev;

      const [moved] = sorted.splice(fromIdx, 1);
      sorted.splice(toIdx, 0, moved);
      const reordered = sorted.map((c, i) => ({ ...c, order: i }));

      const hidden = prev.filter(c => !c.visible);
      return [...reordered, ...hidden];
    });

    setDraggedKey(null);
    setDragOverKey(null);
  }, [draggedKey]);

  const handleDragEnd = useCallback(() => {
    setDraggedKey(null);
    setDragOverKey(null);
  }, []);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-2xl w-[900px] max-h-[80vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Settings size={18} className="text-gray-500" />
            <h2 className="text-lg font-semibold text-gray-900">列设置</h2>
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Left: Available fields */}
          <div className="w-1/2 border-r border-gray-200 flex flex-col">
            <div className="px-4 py-3 border-b border-gray-100">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="搜索字段..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-1">
              {Object.entries(fieldsByCategory).map(([cat, fields]) => (
                <div key={cat}>
                  <button
                    onClick={() => toggleCategory(cat)}
                    className="w-full flex items-center gap-1.5 px-2 py-1.5 text-xs font-medium text-gray-500 hover:bg-gray-50 rounded transition-colors"
                  >
                    {expandedCategories.has(cat) ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    {FIELD_CATEGORY_LABELS[cat as FieldCategory] || cat}
                    <span className="ml-auto text-gray-400">{fields.length}</span>
                  </button>
                  {expandedCategories.has(cat) && (
                    <div className="ml-2">
                      {fields.map(field => {
                        const isActive = config.some(c => c.key === field.key && c.visible);
                        return (
                          <label
                            key={field.key}
                            className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer transition-colors ${
                              isActive ? "bg-blue-50 text-blue-700" : "hover:bg-gray-50 text-gray-700"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isActive}
                              onChange={() => toggleField(field.key)}
                              className="w-3.5 h-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-sm flex-1 truncate">{field.label}</span>
                            {field.performanceHint && (
                              <span className="text-[10px] text-amber-500 px-1">{field.performanceHint}</span>
                            )}
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Right: Active columns config */}
          <div className="w-1/2 flex flex-col">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">
                已选列 ({visibleConfig.length})
              </span>
              <button
                onClick={handleReset}
                className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 transition-colors"
              >
                <RotateCcw size={12} />
                重置
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-1">
              {visibleConfig.sort((a, b) => a.order - b.order).map(col => {
                const field = allFields.find(f => f.key === col.key);
                if (!field) return null;
                return (
                  <div
                    key={col.key}
                    draggable
                    onDragStart={() => handleDragStart(col.key)}
                    onDragOver={(e) => handleDragOver(e, col.key)}
                    onDrop={() => handleDrop(col.key)}
                    onDragEnd={handleDragEnd}
                    className={`flex items-center gap-2 px-2 py-2 bg-white border rounded-lg transition-colors ${
                      dragOverKey === col.key ? "border-blue-400 bg-blue-50" : "border-gray-200"
                    } ${draggedKey === col.key ? "opacity-50" : ""}`}
                  >
                    <GripVertical size={14} className="text-gray-300 cursor-grab shrink-0" />
                    <span className="text-sm text-gray-700 flex-1 truncate">{field.label}</span>
                    <span className="text-[10px] text-gray-400 w-12 text-center">{col.width}px</span>
                    <input
                      type="range"
                      min={field.minWidth}
                      max={field.maxWidth}
                      value={col.width}
                      onChange={(e) => updateWidth(col.key, parseInt(e.target.value))}
                      className="w-16 h-1 accent-blue-500"
                    />
                    {field.frozenAllowed && (
                      <button
                        onClick={() => toggleFrozen(col.key)}
                        className={`text-[10px] px-1.5 py-0.5 rounded transition-colors ${
                          col.frozen
                            ? "bg-blue-100 text-blue-700"
                            : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                        }`}
                      >
                        冻结
                      </button>
                    )}
                    <button
                      onClick={() => removeColumn(col.key)}
                      className="p-0.5 text-gray-300 hover:text-red-500 transition-colors"
                    >
                      <X size={12} />
                    </button>
                  </div>
                );
              })}
              {hiddenConfig.length > 0 && visibleConfig.length > 0 && (
                <div className="pt-2 mt-2 border-t border-gray-100">
                  <span className="text-[10px] text-gray-400 uppercase tracking-wider">未选列</span>
                </div>
              )}
              {hiddenConfig.map(col => {
                const field = allFields.find(f => f.key === col.key);
                if (!field) return null;
                return (
                  <div key={col.key} className="flex items-center gap-2 px-2 py-1.5 text-gray-400 rounded">
                    <span className="text-sm flex-1 truncate">{field.label}</span>
                    <button
                      onClick={() => toggleField(col.key)}
                      className="text-[10px] text-blue-500 hover:text-blue-700 transition-colors"
                    >
                      + 添加
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Save size={14} />
            保存
          </button>
        </div>
      </div>
    </div>
  );
}
