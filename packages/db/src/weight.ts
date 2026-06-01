import type { WeightEntry } from "@caltext/shared";
import { decrypt, encryptContent } from "@caltext/shared";
import { getRedis } from "./client";

const weightKey = (userId: string) => `weight:${userId}`;

function parseWeightMember(plain: string): WeightEntry | null {
  const i = plain.indexOf(":");
  if (i === -1) return null;
  const kg = parseFloat(plain.slice(0, i));
  const date = plain.slice(i + 1);
  if (Number.isNaN(kg) || !date) return null;
  return { weightKg: kg, date };
}

export async function logWeight(userId: string, weightKg: number, date: string): Promise<void> {
  const redis = getRedis();
  const member = await encryptContent(`${weightKg}:${date}`);
  await redis.zadd(weightKey(userId), { score: new Date(date).getTime(), member });
}

export async function getWeightHistory(userId: string, limit = 30): Promise<WeightEntry[]> {
  const redis = getRedis();
  const raw = await redis.zrange<string[]>(weightKey(userId), 0, -1, { rev: true });
  if (!raw || raw.length === 0) return [];

  const out: WeightEntry[] = [];
  for (const entry of raw.slice(0, limit)) {
    const plain = await decrypt(entry);
    const parsed = parseWeightMember(plain);
    if (parsed) out.push(parsed);
  }
  return out;
}

export async function deleteAllWeightData(userId: string): Promise<void> {
  const redis = getRedis();
  await redis.del(weightKey(userId));
}
