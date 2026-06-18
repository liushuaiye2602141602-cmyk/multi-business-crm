"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Calculator, ArrowUpDown } from "lucide-react";

const CURRENCIES = [
  { code: "CNY", name: "人民币", flag: "🇨🇳", rate: 1 },
  { code: "USD", name: "美元", flag: "🇺🇸", rate: 0.138 },
  { code: "EUR", name: "欧元", flag: "🇪🇺", rate: 0.127 },
  { code: "GBP", name: "英镑", flag: "🇬🇧", rate: 0.109 },
  { code: "JPY", name: "日元", flag: "🇯🇵", rate: 21.4 },
  { code: "HKD", name: "港币", flag: "🇭🇰", rate: 1.08 },
  { code: "AUD", name: "澳元", flag: "🇦🇺", rate: 0.211 },
  { code: "CAD", name: "加元", flag: "🇨🇦", rate: 0.189 },
];

export default function CurrencyPopup() {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("100");
  const [fromCurrency, setFromCurrency] = useState("CNY");
  const [toCurrency, setToCurrency] = useState("USD");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const fromRate = CURRENCIES.find(c => c.code === fromCurrency)?.rate || 1;
  const toRate = CURRENCIES.find(c => c.code === toCurrency)?.rate || 1;
  const result = (Number(amount) / fromRate * toRate).toFixed(2);

  const swap = () => {
    setFromCurrency(toCurrency);
    setToCurrency(fromCurrency);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
      >
        <Calculator size={14} />
        <span>汇率计算器</span>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-200 p-4 z-50">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">汇率换算</h3>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <select
                value={fromCurrency}
                onChange={(e) => setFromCurrency(e.target.value)}
                className="flex-1 border border-gray-200 rounded-lg px-2 py-1.5 text-sm"
              >
                {CURRENCIES.map(c => (
                  <option key={c.code} value={c.code}>{c.flag} {c.name} ({c.code})</option>
                ))}
              </select>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-24 border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-right"
              />
            </div>

            <div className="flex justify-center">
              <button onClick={swap} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                <ArrowUpDown size={16} />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={toCurrency}
                onChange={(e) => setToCurrency(e.target.value)}
                className="flex-1 border border-gray-200 rounded-lg px-2 py-1.5 text-sm"
              >
                {CURRENCIES.map(c => (
                  <option key={c.code} value={c.code}>{c.flag} {c.name} ({c.code})</option>
                ))}
              </select>
              <div className="w-24 border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-right bg-gray-50 font-medium">
                {result}
              </div>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-gray-100">
            <Link href="/currency" className="text-xs text-blue-600 hover:underline">
              查看完整汇率 →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
