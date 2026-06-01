import { TZDate } from "@date-fns/tz";
import { addDays, format, getHours, isAfter, set } from "date-fns";

export function nextLocalTime(hour: number, minute: number, tz: string): Date {
  const now = new TZDate(new Date(), tz);
  let target = set(now, { hours: hour, minutes: minute, seconds: 0, milliseconds: 0 });
  if (isAfter(now, target)) {
    target = addDays(target, 1);
  }
  return new Date(target.getTime());
}

export function msUntil(target: Date): number {
  return Math.max(0, target.getTime() - Date.now());
}

export function localDateString(tz: string, date?: Date): string {
  const d = new TZDate(date ?? new Date(), tz);
  return format(d, "yyyy-MM-dd");
}

export function localHour(tz: string, date?: Date): number {
  const d = new TZDate(date ?? new Date(), tz);
  return getHours(d);
}

export function isDayOfWeek(tz: string, dayName: string, date?: Date): boolean {
  const d = new TZDate(date ?? new Date(), tz);
  const day = format(d, "EEEE");
  return day.toLowerCase() === dayName.toLowerCase();
}
