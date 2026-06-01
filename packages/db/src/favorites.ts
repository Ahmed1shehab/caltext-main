import type { MealItem } from "@caltext/shared";
import { decrypt, encrypt, encryptContent } from "@caltext/shared";
import { getRedis } from "./client";

const favoritesKey = (userId: string) => `favorites:${userId}`;

async function favoriteFieldKey(name: string): Promise<string> {
  return encrypt(name.toLowerCase());
}

export async function saveFavorite(userId: string, name: string, items: MealItem[]): Promise<void> {
  const redis = getRedis();
  const key = await favoriteFieldKey(name);
  const value = await encryptContent(JSON.stringify(items));
  await redis.hset(favoritesKey(userId), { [key]: value });
}

export async function getFavorite(userId: string, name: string): Promise<MealItem[] | null> {
  const redis = getRedis();
  const encKey = await favoriteFieldKey(name);
  const raw = await redis.hget(favoritesKey(userId), encKey);
  if (!raw) return null;
  if (Array.isArray(raw)) return raw as MealItem[];
  if (typeof raw !== "string") return null;
  const decrypted = await decrypt(raw);
  return JSON.parse(decrypted) as MealItem[];
}

export async function getAllFavorites(userId: string): Promise<string[]> {
  const redis = getRedis();
  const data = await redis.hgetall<Record<string, string>>(favoritesKey(userId));
  if (!data) return [];
  const keys = Object.keys(data);
  return Promise.all(keys.map((k) => decrypt(k)));
}

export async function deleteFavorite(userId: string, name: string): Promise<void> {
  const redis = getRedis();
  const encKey = await favoriteFieldKey(name);
  await redis.hdel(favoritesKey(userId), encKey);
}

export async function deleteAllFavorites(userId: string): Promise<void> {
  const redis = getRedis();
  await redis.del(favoritesKey(userId));
}
