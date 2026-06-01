import type { OnboardingState } from "@caltext/shared";
import { decrypt, encryptContent } from "@caltext/shared";
import { getRedis } from "./client";

const onboardingKey = (userId: string) => `onboarding:${userId}`;
const TTL_24H = 60 * 60 * 24;

export async function getOnboardingState(userId: string): Promise<OnboardingState | null> {
  const redis = getRedis();
  const data = await redis.hgetall(onboardingKey(userId));
  if (!data || Object.keys(data).length === 0) return null;
  const d = data as Record<string, unknown>;
  const result: OnboardingState = {};
  if (d.name) result.name = await decrypt(String(d.name));
  if (String(d.timezoneConfirmed) === "true") result.timezoneConfirmed = true;
  if (d.timezone) result.timezone = String(d.timezone);
  if (d.sex) result.sex = String(d.sex) as OnboardingState["sex"];
  if (d.age) result.age = Number(d.age);
  if (d.heightCm) result.heightCm = Number(d.heightCm);
  if (d.weightKg) result.weightKg = Number(d.weightKg);
  if (d.goal) result.goal = String(d.goal) as OnboardingState["goal"];
  if (d.activity) result.activity = String(d.activity) as OnboardingState["activity"];
  if (String(d.consented) === "true") result.consented = true;
  if (d.detectedLocale) result.detectedLocale = String(d.detectedLocale);
  if (d.lastBotReply) result.lastBotReply = await decrypt(String(d.lastBotReply));
  return result;
}

export async function setOnboardingState(
  userId: string,
  state: Partial<OnboardingState>,
): Promise<void> {
  const redis = getRedis();
  const flat: Record<string, string> = {};
  for (const [k, v] of Object.entries(state)) {
    if (v === undefined) continue;
    if (k === "name" || k === "lastBotReply") {
      flat[k] = await encryptContent(String(v));
    } else {
      flat[k] = String(v);
    }
  }
  const key = onboardingKey(userId);
  const pipeline = redis.pipeline();
  pipeline.hset(key, flat);
  pipeline.expire(key, TTL_24H);
  await pipeline.exec();
}

export async function deleteOnboardingState(userId: string): Promise<void> {
  const redis = getRedis();
  await redis.del(onboardingKey(userId));
}
