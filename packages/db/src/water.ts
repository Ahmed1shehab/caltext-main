import type { WaterLog } from "@caltext/shared";
import { getRedis } from "./client";

const waterKey = (userId: string, localDate: string) => `water:${userId}:${localDate}`;

export async function logWater(userId: string, localDate: string, ml: number): Promise<void> {
  const redis = getRedis();
  const key = waterKey(userId, localDate);
  const pipeline = redis.pipeline();
  pipeline.hincrbyfloat(key, "totalMl", ml);
  await pipeline.exec();
}

export async function getWaterLog(userId: string, localDate: string): Promise<WaterLog> {
  const redis = getRedis();
  const data = await redis.hgetall(waterKey(userId, localDate));
  if (!data || Object.keys(data).length === 0) {
    return { totalMl: 0, glasses: 0 };
  }
  const totalMl = Number((data as Record<string, unknown>).totalMl ?? 0);
  return {
    totalMl,
    glasses: Math.floor(totalMl / 250),
  };
}
