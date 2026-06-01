import type { DailyLog } from "@caltext/shared";
import { format, parseISO, subDays } from "date-fns";
import { getRedis } from "./client";
import { getMealsForDate } from "./meals";

const dailyKey = (userId: string, localDate: string) => `daily:${userId}:${localDate}`;

export async function updateDailyTotals(
  userId: string,
  localDate: string,
  addCalories: number,
  addProtein: number,
  addCarbs: number,
  addFat: number,
  addFiber: number,
): Promise<void> {
  const redis = getRedis();
  const key = dailyKey(userId, localDate);
  const pipeline = redis.pipeline();
  pipeline.hincrbyfloat(key, "calories", addCalories);
  pipeline.hincrbyfloat(key, "protein", addProtein);
  pipeline.hincrbyfloat(key, "carbs", addCarbs);
  pipeline.hincrbyfloat(key, "fat", addFat);
  pipeline.hincrbyfloat(key, "fiber", addFiber);
  pipeline.hincrby(key, "mealCount", 1);
  await pipeline.exec();
}

export async function subtractDailyTotals(
  userId: string,
  localDate: string,
  calories: number,
  protein: number,
  carbs: number,
  fat: number,
  fiber: number,
): Promise<void> {
  const redis = getRedis();
  const key = dailyKey(userId, localDate);
  const pipeline = redis.pipeline();
  pipeline.hincrbyfloat(key, "calories", -calories);
  pipeline.hincrbyfloat(key, "protein", -protein);
  pipeline.hincrbyfloat(key, "carbs", -carbs);
  pipeline.hincrbyfloat(key, "fat", -fat);
  pipeline.hincrbyfloat(key, "fiber", -fiber);
  pipeline.hincrby(key, "mealCount", -1);
  await pipeline.exec();
}

export async function deleteDailyLog(userId: string, localDate: string): Promise<void> {
  const redis = getRedis();
  await redis.del(dailyKey(userId, localDate));
}

export async function getDailyLog(userId: string, localDate: string): Promise<DailyLog> {
  const redis = getRedis();
  const [data, meals] = await Promise.all([
    redis.hgetall(dailyKey(userId, localDate)) as Promise<Record<string, unknown> | null>,
    getMealsForDate(userId, localDate),
  ]);
  return {
    calories: Number(data?.calories ?? 0),
    protein: Number(data?.protein ?? 0),
    carbs: Number(data?.carbs ?? 0),
    fat: Number(data?.fat ?? 0),
    fiber: Number(data?.fiber ?? 0),
    mealCount: Number(data?.mealCount ?? 0),
    meals,
  };
}

export async function getWeeklyLogs(
  userId: string,
  endDate: string,
): Promise<{ date: string; log: DailyLog }[]> {
  const end = parseISO(endDate);
  const dates = Array.from({ length: 7 }, (_, i) => format(subDays(end, 6 - i), "yyyy-MM-dd"));
  const logs = await Promise.all(dates.map((d) => getDailyLog(userId, d)));
  return dates.map((date, i) => ({ date, log: logs[i]! }));
}
