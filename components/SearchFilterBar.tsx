"use client";

import { Search, X } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import { useState, useTransition } from "react";

interface FilterOption {
  name: string;
  label: string;
  options: { value: string; label: string }[];
}

interface SearchFilterBarProps {
  searchPlaceholder?: string;
  filters?: FilterOption[];
  defaultSearch?: string;
  defaultFilters?: Record<string, string>;
}

export default function SearchFilterBar({
  searchPlaceholder = "搜索...",
  filters = [],
  defaultSearch = "",
  defaultFilters = {},
}: SearchFilterBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState(defaultSearch);
  const [filterValues, setFilterValues] = useState<Record<string, string>>(defaultFilters);

  function applyFilters(newSearch?: string, newFilters?: Record<string, string>) {
    const s = newSearch ?? search;
    const f = newFilters ?? filterValues;
    const params = new URLSearchParams();
    if (s) params.set("search", s);
    Object.entries(f).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  }

  function resetFilters() {
    setSearch("");
    setFilterValues({});
    startTransition(() => {
      router.push(pathname);
    });
  }

  const hasActiveFilters = search || Object.values(filterValues).some((v) => v);

  return (
    <div className="bg-white rounded-lg border p-4 mb-4">
      <div className="flex flex-wrap items-center gap-3">
        {/* 搜索框 */}
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") applyFilters();
            }}
            placeholder={searchPlaceholder}
            className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* 筛选器 */}
        {filters.map((filter) => (
          <select
            key={filter.name}
            value={filterValues[filter.name] || ""}
            onChange={(e) => {
              const newFilters = { ...filterValues, [filter.name]: e.target.value };
              setFilterValues(newFilters);
              applyFilters(undefined, newFilters);
            }}
            className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">{filter.label}</option>
            {filter.options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        ))}

        {/* 搜索按钮 */}
        <button
          onClick={() => applyFilters()}
          disabled={isPending}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          搜索
        </button>

        {/* 重置按钮 */}
        {hasActiveFilters && (
          <button
            onClick={resetFilters}
            disabled={isPending}
            className="flex items-center gap-1 text-gray-500 px-3 py-2 rounded-lg text-sm hover:bg-gray-100 transition-colors"
          >
            <X size={14} />
            重置
          </button>
        )}
      </div>
    </div>
  );
}
