"use client";

import { useState } from "react";
import { ArrowRightLeft, Coins, TrendingUp } from "lucide-react";
import Card, { CardHeader } from "@/components/ui/Card";

const DEFAULT_RATES: Record<string, number> = {
  USD: 1,
  EUR: 0.92,
  GBP: 0.79,
  CNY: 7.25,
  JPY: 155,
  HKD: 7.82,
  AUD: 1.53,
  CAD: 1.37,
  SGD: 1.34,
};

const CURRENCY_NAMES: Record<string, string> = {
  USD: "美元",
  EUR: "欧元",
  GBP: "英镑",
  CNY: "人民币",
  JPY: "日元",
  HKD: "港币",
  AUD: "澳元",
  CAD: "加元",
  SGD: "新加坡元",
};

const QUICK_PAIRS = [
  { from: "USD", to: "CNY" },
  { from: "EUR", to: "CNY" },
  { from: "GBP", to: "CNY" },
  { from: "CNY", to: "USD" },
  { from: "USD", to: "EUR" },
  { from: "USD", to: "JPY" },
  { from: "USD", to: "HKD" },
  { from: "USD", to: "GBP" },
];

function convert(amount: number, from: string, to: string): number {
  if (from === to) return amount;
  const usdAmount = amount / DEFAULT_RATES[from];
  return usdAmount * DEFAULT_RATES[to];
}

export default function CurrencyPage() {
  const [amount, setAmount] = useState<string>("1000");
  const [fromCurrency, setFromCurrency] = useState("USD");
  const [toCurrency, setToCurrency] = useState("CNY");

  const numericAmount = parseFloat(amount) || 0;
  const result = convert(numericAmount, fromCurrency, toCurrency);
  const rate = convert(1, fromCurrency, toCurrency);

  const handleSwap = () => {
    setFromCurrency(toCurrency);
    setToCurrency(fromCurrency);
  };

  const handleQuickPair = (from: string, to: string) => {
    setFromCurrency(from);
    setToCurrency(to);
    if (!amount || amount === "0") setAmount("1000");
  };

  return (
    <div>
      {/* Converter Card */}
      <Card className="mb-6">
        <CardHeader title="汇率换算" description="输入金额，选择货币，即时换算" />
        <div className="grid grid-cols-[1fr,auto,1fr] gap-4 items-end">
          {/* From */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">金额</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="输入金额"
              min="0"
              step="any"
            />
            <select
              value={fromCurrency}
              onChange={(e) => setFromCurrency(e.target.value)}
              className="w-full mt-2 px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
            >
              {Object.keys(DEFAULT_RATES).map((code) => (
                <option key={code} value={code}>
                  {code} - {CURRENCY_NAMES[code]}
                </option>
              ))}
            </select>
          </div>

          {/* Swap Button */}
          <button
            onClick={handleSwap}
            className="p-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-colors mb-7"
            title="交换货币"
          >
            <ArrowRightLeft size={20} className="text-gray-500" />
          </button>

          {/* To */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">换算结果</label>
            <div className="w-full px-3 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-sm font-semibold text-gray-900 min-h-[42px] flex items-center">
              {result.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <select
              value={toCurrency}
              onChange={(e) => setToCurrency(e.target.value)}
              className="w-full mt-2 px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
            >
              {Object.keys(DEFAULT_RATES).map((code) => (
                <option key={code} value={code}>
                  {code} - {CURRENCY_NAMES[code]}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Rate Info */}
        <div className="mt-4 pt-4 border-t border-gray-100 text-xs text-gray-500 text-center">
          1 {fromCurrency} = {rate.toFixed(4)} {toCurrency}
        </div>
      </Card>

      {/* Quick Pairs */}
      <Card className="mb-6">
        <CardHeader title="常用汇率" description="点击快速切换货币对" />
        <div className="grid grid-cols-4 gap-2">
          {QUICK_PAIRS.map((pair) => {
            const pairRate = convert(1, pair.from, pair.to);
            return (
              <button
                key={`${pair.from}-${pair.to}`}
                onClick={() => handleQuickPair(pair.from, pair.to)}
                className={`p-3 rounded-lg border text-left transition-all hover:shadow-sm ${
                  fromCurrency === pair.from && toCurrency === pair.to
                    ? "border-blue-300 bg-blue-50 ring-1 ring-blue-200"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className="text-xs font-semibold text-gray-900">
                  {pair.from} → {pair.to}
                </div>
                <div className="text-sm font-bold text-blue-600 mt-1">
                  {pairRate.toFixed(4)}
                </div>
                <div className="text-[10px] text-gray-400 mt-0.5">
                  {CURRENCY_NAMES[pair.from]} → {CURRENCY_NAMES[pair.to]}
                </div>
              </button>
            );
          })}
        </div>
      </Card>

      {/* Full Rate Table */}
      <Card>
        <CardHeader title="全部汇率" description="以 USD 为基准的参考汇率" action={<Coins size={18} className="text-gray-400" />} />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left py-3 px-4 font-medium text-gray-600 text-xs uppercase tracking-wider">货币代码</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600 text-xs uppercase tracking-wider">货币名称</th>
                <th className="text-right py-3 px-4 font-medium text-gray-600 text-xs uppercase tracking-wider">兑 1 USD</th>
                <th className="text-right py-3 px-4 font-medium text-gray-600 text-xs uppercase tracking-wider">1 单位兑 USD</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {Object.entries(DEFAULT_RATES).map(([code, rate]) => (
                <tr key={code} className="hover:bg-gray-50 transition-colors">
                  <td className="py-3 px-4 font-medium text-gray-900">{code}</td>
                  <td className="py-3 px-4 text-gray-600">{CURRENCY_NAMES[code]}</td>
                  <td className="py-3 px-4 text-right text-gray-700 font-mono tabular-nums">{rate.toFixed(4)}</td>
                  <td className="py-3 px-4 text-right text-gray-700 font-mono tabular-nums">{(1 / rate).toFixed(6)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-2 text-[11px] text-gray-400 border-t border-gray-100">
          * 汇率为参考值，实际交易以银行牌价为准
        </div>
      </Card>
    </div>
  );
}
