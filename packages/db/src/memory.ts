import { decrypt, encryptContent } from "@caltext/shared";
import { getRedis } from "./client";

const memoryKey = (userId: string) => `memory:${userId}`;

export async function saveMemory(userId: string, key: string, value: string): Promise<void> {
  const redis = getRedis();
  const enc = await encryptContent(value);
  await redis.hset(memoryKey(userId), { [key]: enc });
}

export async function recallAllMemories(userId: string): Promise<Record<string, string>> {
  const redis = getRedis();
  const data = await redis.hgetall<Record<string, string>>(memoryKey(userId));
  if (!data) return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(data)) {
    out[k] = await decrypt(v);
  }
  return out;
}

export async function recallMemory(userId: string, key: string): Promise<string | null> {
  const redis = getRedis();
  const raw = await redis.hget<string>(memoryKey(userId), key);
  if (raw == null) return null;
  return decrypt(String(raw));
}

export async function deleteMemory(userId: string, key: string): Promise<void> {
  const redis = getRedis();
  await redis.hdel(memoryKey(userId), key);
}
