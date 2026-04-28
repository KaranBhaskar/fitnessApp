import { ConvexError } from "convex/values";

export function assertDateKey(date: string, options: { allowFuture?: boolean } = {}) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new ConvexError({ code: "INVALID_INPUT", message: "Use dates in YYYY-MM-DD format." });
  }
  const parsed = new Date(`${date}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) {
    throw new ConvexError({ code: "INVALID_INPUT", message: "Use a real calendar date." });
  }
  const today = new Date().toISOString().slice(0, 10);
  if (!options.allowFuture && date > today) {
    throw new ConvexError({ code: "INVALID_INPUT", message: "Future dates are not allowed." });
  }
}

export function assertNumberRange(name: string, value: number, min: number, max: number) {
  if (!Number.isFinite(value) || value < min || value > max) {
    throw new ConvexError({ code: "INVALID_INPUT", message: `${name} must be between ${min} and ${max}.` });
  }
}

export function assertStringLength(name: string, value: string, max: number, min = 1) {
  const trimmed = value.trim();
  if (trimmed.length < min || trimmed.length > max) {
    throw new ConvexError({ code: "INVALID_INPUT", message: `${name} must be ${min}-${max} characters.` });
  }
}

export function assertEmail(email: string) {
  const normalized = email.trim().toLowerCase();
  if (normalized.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    throw new ConvexError({ code: "INVALID_INPUT", message: "Enter a valid email address." });
  }
  return normalized;
}
