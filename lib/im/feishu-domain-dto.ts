import type { ParsedIntent } from "./feishu-parser";

export function normalizeCreateLeadParameters(parameters: ParsedIntent["parameters"]): ParsedIntent["parameters"] {
  return {
    ...parameters,
    keyword: cleanEntityName(parameters.keyword || parameters.exactName || undefined) || parameters.keyword,
    exactName: cleanEntityName(parameters.exactName || undefined) || parameters.exactName,
    country: normalizeCountry(parameters.country),
    phone: normalizePhone(parameters.phone),
    requirement: normalizeRequirement(parameters.requirement),
  };
}

export function normalizeCustomerChangesForParser(changes: Record<string, unknown>): Record<string, unknown> {
  const normalized = { ...changes };
  if (typeof normalized.grade === "string") {
    normalized.grade = normalized.grade.toUpperCase().replace("级", "");
  }
  if (typeof normalized.phone === "string") {
    normalized.phone = normalizePhone(normalized.phone);
  }
  return normalized;
}

export function cleanEntityName(value?: string | null): string | null {
  const cleaned = String(value || "")
    .replace(/^(把|将|给|为|查询|查看|告诉我|帮我|请)/, "")
    .replace(/^(客户|线索|正式客户|潜在线索)/, "")
    .replace(/(所在的线索|对应的线索|已经确认合作)$/, "")
    .replace(/[。！？；，,;]+$/g, "")
    .trim();
  return cleaned || null;
}

export function normalizeCountry(value?: string | null): string | undefined {
  if (!value) return undefined;
  const map: Record<string, string> = {
    加拿大: "加拿大",
    Canada: "Canada",
    canada: "Canada",
    美国: "美国",
    USA: "美国",
    US: "美国",
    中国: "中国",
  };
  return map[value] || value;
}

export function normalizePhone(value?: string | null): string | undefined {
  if (!value) return undefined;
  return value.replace(/^＋/, "+").replace(/[。！？；，,;]+$/g, "").trim();
}

export function normalizeRequirement(value?: string | null): string | undefined {
  if (!value) return undefined;
  return value.replace(/[。！？；]+$/g, "").trim();
}
