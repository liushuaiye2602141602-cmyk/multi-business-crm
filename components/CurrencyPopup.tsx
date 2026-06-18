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
  { code: "TWD", name: "新台币", flag: "🇹🇼", rate: 4.45 },
  { code: "KRW", name: "韩元", flag: "🇰🇷", rate: 190 },
  { code: "SGD", name: "新加坡元", flag: "🇸🇬", rate: 0.186 },
  { code: "AUD", name: "澳元", flag: "🇦🇺", rate: 0.211 },
  { code: "NZD", name: "新西兰元", flag: "🇳🇿", rate: 0.228 },
  { code: "CAD", name: "加元", flag: "🇨🇦", rate: 0.189 },
  { code: "CHF", name: "瑞士法郎", flag: "🇨🇭", rate: 0.123 },
  { code: "SEK", name: "瑞典克朗", flag: "🇸🇪", rate: 1.42 },
  { code: "NOK", name: "挪威克朗", flag: "🇳🇴", rate: 1.48 },
  { code: "DKK", name: "丹麦克朗", flag: "🇩🇰", rate: 0.95 },
  { code: "RUB", name: "俄罗斯卢布", flag: "🇷🇺", rate: 12.5 },
  { code: "INR", name: "印度卢比", flag: "🇮🇳", rate: 11.6 },
  { code: "BRL", name: "巴西雷亚尔", flag: "🇧🇷", rate: 0.78 },
  { code: "MXN", name: "墨西哥比索", flag: "🇲🇽", rate: 2.35 },
  { code: "THB", name: "泰铢", flag: "🇹🇭", rate: 4.72 },
  { code: "IDR", name: "印尼盾", flag: "🇮🇩", rate: 2180 },
  { code: "MYR", name: "马来西亚林吉特", flag: "🇲🇾", rate: 0.62 },
  { code: "PHP", name: "菲律宾比索", flag: "🇵🇭", rate: 7.85 },
  { code: "VND", name: "越南盾", flag: "🇻🇳", rate: 3550 },
  { code: "AED", name: "阿联酋迪拉姆", flag: "🇦🇪", rate: 0.507 },
  { code: "SAR", name: "沙特里亚尔", flag: "🇸🇦", rate: 0.518 },
  { code: "TRY", name: "土耳其里拉", flag: "🇹🇷", rate: 4.75 },
  { code: "ZAR", name: "南非兰特", flag: "🇿🇦", rate: 2.55 },
  { code: "PLN", name: "波兰兹罗提", flag: "🇵🇱", rate: 0.55 },
  { code: "CZK", name: "捷克克朗", flag: "🇨🇿", rate: 3.2 },
  { code: "HUF", name: "匈牙利福林", flag: "🇭🇺", rate: 50 },
  { code: "CLP", name: "智利比索", flag: "🇨🇱", rate: 132 },
  { code: "COP", name: "哥伦比亚比索", flag: "🇨🇴", rate: 580 },
  { code: "ARS", name: "阿根廷比索", flag: "🇦🇷", rate: 140 },
  { code: "NGN", name: "尼日利亚奈拉", flag: "🇳🇬", rate: 215 },
  { code: "EGP", name: "埃及镑", flag: "🇪🇬", rate: 6.75 },
  { code: "PKR", name: "巴基斯坦卢比", flag: "🇵🇰", rate: 38.5 },
  { code: "BDT", name: "孟加拉塔卡", flag: "🇧🇩", rate: 16.5 },
  { code: "KES", name: "肯尼亚先令", flag: "🇰🇪", rate: 17.8 },
  { code: "GHS", name: "加纳塞地", flag: "🇬🇭", rate: 2.15 },
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
