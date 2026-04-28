import { cmToFeetInches, kgToLb, round } from "./calculations";

export function formatWeight(kg: number, unit: "metric" | "us" = "metric"): string {
  return unit === "metric" ? `${round(kg, 1)} kg` : `${round(kgToLb(kg), 1)} lb`;
}

export function formatHeight(cm: number, unit: "metric" | "us" = "metric"): string {
  if (unit === "metric") return `${round(cm, 0)} cm`;
  const { feet, inches } = cmToFeetInches(cm);
  return `${feet}'${round(inches, 0)}"`;
}

export function formatNumber(value: number, digits = 1): string {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: digits }).format(value);
}

export function classNames(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(" ");
}
