export function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function addDays(dateKey: string, days: number): string {
  const date = new Date(`${dateKey}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return toDateKey(date);
}

export function daysBetween(startDateKey: string, endDateKey: string): number {
  const start = new Date(`${startDateKey}T00:00:00.000Z`).getTime();
  const end = new Date(`${endDateKey}T00:00:00.000Z`).getTime();
  return Math.round((end - start) / 86_400_000);
}

export function todayKey(): string {
  return toDateKey(new Date());
}

export function lastNDays(dateKey: string, days: number): string[] {
  return Array.from({ length: days }, (_, index) => addDays(dateKey, -index));
}
