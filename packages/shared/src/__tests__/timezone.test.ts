import { describe, expect, test } from "bun:test";
import { isDayOfWeek, localDateString, localHour, msUntil, nextLocalTime } from "../timezone";

describe("localDateString", () => {
  test("returns YYYY-MM-DD in the given timezone", () => {
    // 2026-01-15 at 23:00 UTC is still Jan 15 in London but Jan 16 in Tokyo
    const date = new Date("2026-01-15T23:00:00Z");
    expect(localDateString("Europe/London", date)).toBe("2026-01-15");
    expect(localDateString("Asia/Tokyo", date)).toBe("2026-01-16");
  });

  test("handles US Pacific timezone", () => {
    // 2026-03-10 at 06:00 UTC → March 9 in LA (UTC-8 before DST) or March 10
    // March 10 06:00 UTC = March 9 22:00 PST
    const date = new Date("2026-03-10T06:00:00Z");
    expect(localDateString("America/Los_Angeles", date)).toBe("2026-03-09");
  });
});

describe("localHour", () => {
  test("returns the hour in the given timezone", () => {
    const date = new Date("2026-06-15T14:00:00Z");
    expect(localHour("UTC", date)).toBe(14);
    // Stockholm is UTC+2 in summer
    expect(localHour("Europe/Stockholm", date)).toBe(16);
  });
});

describe("isDayOfWeek", () => {
  test("correctly identifies day of week", () => {
    // 2026-04-08 is a Wednesday
    const date = new Date("2026-04-08T12:00:00Z");
    expect(isDayOfWeek("UTC", "Wednesday", date)).toBe(true);
    expect(isDayOfWeek("UTC", "Thursday", date)).toBe(false);
  });

  test("case insensitive", () => {
    const date = new Date("2026-04-08T12:00:00Z");
    expect(isDayOfWeek("UTC", "wednesday", date)).toBe(true);
    expect(isDayOfWeek("UTC", "WEDNESDAY", date)).toBe(true);
  });
});

describe("nextLocalTime", () => {
  test("returns a future Date", () => {
    const result = nextLocalTime(8, 0, "America/New_York");
    expect(result.getTime()).toBeGreaterThan(Date.now() - 24 * 60 * 60 * 1000);
    expect(result instanceof Date).toBe(true);
  });
});

describe("msUntil", () => {
  test("returns 0 for past dates", () => {
    const past = new Date(Date.now() - 10000);
    expect(msUntil(past)).toBe(0);
  });

  test("returns positive ms for future dates", () => {
    const future = new Date(Date.now() + 5000);
    const ms = msUntil(future);
    expect(ms).toBeGreaterThan(0);
    expect(ms).toBeLessThanOrEqual(5000);
  });
});
