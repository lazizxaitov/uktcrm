import Decimal from "decimal.js";

export function d(value: string | number | null | undefined) {
  if (value === null || value === undefined) return new Decimal(0);
  const v = typeof value === "number" ? String(value) : value;
  const cleaned = v.trim().replace(",", ".");
  if (!cleaned) return new Decimal(0);
  return new Decimal(cleaned);
}

export function s(value: Decimal, dp = 2) {
  // store without scientific notation
  return value.toFixed(dp);
}

