import { describe, expect, mock, test } from "bun:test";

const mockRedis = {
  hgetall: mock(() => Promise.resolve(null)),
  zrange: mock(() => Promise.resolve([])),
};

mock.module("../client", () => ({
  getRedis: () => mockRedis,
}));

mock.module("@caltext/shared", () => ({
  env: {},
}));

const { getWeeklyLogs } = await import("../daily-log");

describe("getWeeklyLogs", () => {
  test("returns 7 days of results", async () => {
    const results = await getWeeklyLogs("usr_test", "2026-04-08");
    expect(results).toHaveLength(7);
  });

  test("date range is correct (endDate - 6 days through endDate)", async () => {
    const results = await getWeeklyLogs("usr_test", "2026-04-08");
    expect(results[0]!.date).toBe("2026-04-02");
    expect(results[6]!.date).toBe("2026-04-08");
  });

  test("handles month boundary correctly", async () => {
    const results = await getWeeklyLogs("usr_test", "2026-03-03");
    expect(results[0]!.date).toBe("2026-02-25");
    expect(results[6]!.date).toBe("2026-03-03");
  });

  test("handles year boundary correctly", async () => {
    const results = await getWeeklyLogs("usr_test", "2026-01-02");
    expect(results[0]!.date).toBe("2025-12-27");
    expect(results[6]!.date).toBe("2026-01-02");
  });

  test("dates are sequential (no gaps or duplicates)", async () => {
    const results = await getWeeklyLogs("usr_test", "2026-04-08");
    for (let i = 1; i < results.length; i++) {
      const prev = new Date(results[i - 1]!.date);
      const curr = new Date(results[i]!.date);
      const diffMs = curr.getTime() - prev.getTime();
      expect(diffMs).toBe(24 * 60 * 60 * 1000);
    }
  });
});
