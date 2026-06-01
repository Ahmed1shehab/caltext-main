import { describe, expect, mock, test } from "bun:test";

const weightStore: Record<string, { score: number; member: string }[]> = {};

const mockRedis = {
  zadd: mock((key: string, entry: { score: number; member: string }) => {
    if (!weightStore[key]) weightStore[key] = [];
    weightStore[key].push(entry);
    weightStore[key].sort((a, b) => b.score - a.score);
    return Promise.resolve(1);
  }),
  zrange: mock((key: string, _start: number, _end: number, opts?: { rev: boolean }) => {
    if (!weightStore[key]) return Promise.resolve([]);
    const entries = weightStore[key].map((e) => e.member);
    if (opts?.rev) return Promise.resolve(entries);
    return Promise.resolve(entries.reverse());
  }),
  del: mock(() => Promise.resolve(1)),
};

mock.module("../client", () => ({
  getRedis: () => mockRedis,
}));

mock.module("@caltext/shared", () => ({
  env: {},
  encryptContent: async (s: string) => `enc:${s}`,
  decrypt: async (s: string) => {
    if (!s.startsWith("enc:")) throw new Error("bad ciphertext");
    return s.slice(4);
  },
}));

const { logWeight, getWeightHistory, deleteAllWeightData } = await import("../weight");

describe("weight tracking", () => {
  test("logWeight stores an entry", async () => {
    await logWeight("usr_test", 75.5, "2026-04-01");
    await logWeight("usr_test", 75.0, "2026-04-08");
    const history = await getWeightHistory("usr_test", 10);
    expect(history.length).toBe(2);
    expect(history[0]!.weightKg).toBe(75);
    expect(history[0]!.date).toBe("2026-04-08");
  });

  test("getWeightHistory returns empty for unknown user", async () => {
    const history = await getWeightHistory("usr_unknown", 10);
    expect(history).toEqual([]);
  });

  test("deleteAllWeightData clears data", async () => {
    await deleteAllWeightData("usr_test");
    expect(mockRedis.del).toHaveBeenCalled();
  });
});
