import type { MealEntry } from "@caltext/shared";
import { decrypt, encryptContent } from "@caltext/shared";
import { getRedis } from "./client";

const mealKey = (id: string) => `meal:${id}`;
const mealsIndexKey = (userId: string, localDate: string) => `meals:${userId}:${localDate}`;

function safeParseArray(val: unknown): unknown[] {
  if (Array.isArray(val)) return val;
  if (typeof val === "string") return JSON.parse(val) as unknown[];
  return [];
}

export async function saveMeal(meal: MealEntry): Promise<void> {
  const redis = getRedis();
  const [name, items, photoUrl, source] = await Promise.all([
    encryptContent(meal.name ?? ""),
    encryptContent(JSON.stringify(meal.items)),
    encryptContent(meal.photoUrl ?? ""),
    encryptContent(meal.source),
  ]);
  const pipeline = redis.pipeline();
  pipeline.hset(mealKey(meal.id), {
    userId: meal.userId,
    name,
    items,
    totalCalories: String(meal.totalCalories),
    totalProtein: String(meal.totalProtein),
    totalCarbs: String(meal.totalCarbs),
    totalFat: String(meal.totalFat),
    totalFiber: String(meal.totalFiber),
    photoUrl,
    source,
    timestamp: meal.timestamp,
    localDate: meal.localDate,
  });
  pipeline.zadd(mealsIndexKey(meal.userId, meal.localDate), {
    score: new Date(meal.timestamp).getTime(),
    member: meal.id,
  });
  await pipeline.exec();
}

async function parseMeal(
  id: string,
  data: Record<string, unknown>,
  fallbackUserId?: string,
  fallbackDate?: string,
): Promise<MealEntry> {
  const nameRaw = data.name ? String(data.name) : "";
  const nameDec = nameRaw ? await decrypt(nameRaw) : "";
  const name = nameDec ? nameDec : undefined;

  const itemsRaw = await decrypt(String(data.items ?? "[]"));
  const items = safeParseArray(itemsRaw) as MealEntry["items"];

  const photoRaw = data.photoUrl ? String(data.photoUrl) : "";
  const photoDec = photoRaw ? await decrypt(photoRaw) : "";
  const photoUrl = photoDec ? photoDec : undefined;

  const sourceDec = await decrypt(String(data.source ?? "text"));

  return {
    id,
    userId: String(data.userId ?? fallbackUserId ?? ""),
    name,
    items,
    totalCalories: Number(data.totalCalories ?? 0),
    totalProtein: Number(data.totalProtein ?? 0),
    totalCarbs: Number(data.totalCarbs ?? 0),
    totalFat: Number(data.totalFat ?? 0),
    totalFiber: Number(data.totalFiber ?? 0),
    photoUrl,
    source: String(sourceDec || "text") as MealEntry["source"],
    timestamp: String(data.timestamp ?? new Date().toISOString()),
    localDate: String(data.localDate ?? fallbackDate ?? ""),
  };
}

export async function getMeal(mealId: string): Promise<MealEntry | null> {
  const redis = getRedis();
  const data = await redis.hgetall(mealKey(mealId));
  if (!data || Object.keys(data).length === 0) return null;
  return parseMeal(mealId, data as Record<string, unknown>);
}

export async function deleteMeal(mealId: string, userId: string, localDate: string): Promise<void> {
  const redis = getRedis();
  const pipeline = redis.pipeline();
  pipeline.del(mealKey(mealId));
  pipeline.zrem(mealsIndexKey(userId, localDate), mealId);
  await pipeline.exec();
}

export async function deleteAllMealsForDate(userId: string, localDate: string): Promise<string[]> {
  const redis = getRedis();
  const mealIds = await redis.zrange<string[]>(mealsIndexKey(userId, localDate), 0, -1);
  if (!mealIds || mealIds.length === 0) return [];
  const pipeline = redis.pipeline();
  for (const id of mealIds) {
    pipeline.del(mealKey(id));
  }
  pipeline.del(mealsIndexKey(userId, localDate));
  await pipeline.exec();
  return mealIds;
}

export async function getMealsForDate(userId: string, localDate: string): Promise<MealEntry[]> {
  const redis = getRedis();
  const mealIds = await redis.zrange<string[]>(mealsIndexKey(userId, localDate), 0, -1);
  if (!mealIds || mealIds.length === 0) return [];

  const pipeline = redis.pipeline();
  for (const id of mealIds) {
    pipeline.hgetall(mealKey(id));
  }
  const results = await pipeline.exec();

  const meals: MealEntry[] = [];
  for (let i = 0; i < mealIds.length; i++) {
    const data = results[i];
    if (!data || Object.keys(data).length === 0) continue;
    meals.push(await parseMeal(mealIds[i]!, data as Record<string, unknown>, userId, localDate));
  }
  return meals;
}
