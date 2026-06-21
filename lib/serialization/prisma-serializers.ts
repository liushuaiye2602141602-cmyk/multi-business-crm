export type SerializablePrimitive = string | number | boolean | null;

export function decimalToString(value: { toString(): string } | string | number | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  return value.toString();
}

export const nullableDecimalToString = decimalToString;

export function dateToIso(value: Date | string | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return value.toISOString();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function enumToString(value: { toString(): string } | string | null | undefined): string {
  return value == null ? "" : value.toString();
}
