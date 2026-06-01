import { describe, expect, mock, test } from "bun:test";

const waterStore: Record<string, Record<string, string>> = {};

const mockRedis = {
  hincrbyfloat: mock((key: string, field: string, value: number) => {
    if (!waterStore[key]) waterStore[key] = {};
    const current = parseFloat(waterStore[key][field] ?? "0");
    waterStore[key][field] = String(current + value);
    return Promise.resolve(current + value);
  }),
  hgetall: mock((key: string) => {
    return Promise.resolve(waterStore[key] ?? null);
  }),
  pipeline: () => {
    const ops: (() => Promise<unknown>)[] = [];
    const p = {
      hincrbyfloat(key: string, field: string, value: number) {
        ops.push(() => mockRedis.hincrbyfloat(key, field, value));
        return p;
      },
      expire() {
        return p;
      },
      exec: () => Promise.all(ops.map((fn) => fn())),
    };
    return p;
  },
};

mock.module("../client", () => ({
  getRedis: () => mockRedis,
}));

mock.module("@caltext/shared", () => ({
  env: {},
}));

const { logWater, getWaterLog } = await import("../water");

describe("water tracking", () => {
  test("logWater increments totalMl", async () => {
    await logWater("usr_test", "2026-04-08", 250);
    const log = await getWaterLog("usr_test", "2026-04-08");
    expect(log.totalMl).toBe(250);
    expect(log.glasses).toBe(1);
  });

  test("logWater accumulates", async () => {
    await logWater("usr_test", "2026-04-08", 500);
    const log = await getWaterLog("usr_test", "2026-04-08");
    expect(log.totalMl).toBe(750);
    expect(log.glasses).toBe(3);
  });

  test("getWaterLog returns zero for no data", async () => {
    const log = await getWaterLog("usr_test", "2026-01-01");
    expect(log.totalMl).toBe(0);
    expect(log.glasses).toBe(0);
  });
});
