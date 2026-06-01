import type { StreakInfo } from "@caltext/shared";
import { format, parseISO, subDays } from "date-fns";
import { getRedis } from "./client";

const streakKey = (userId: string) => `streak:${userId}`;

export async function getStreak(userId: string): Promise<StreakInfo> {
  const redis = getRedis();
  const data = await redis.hgetall(streakKey(userId));
  if (!data || Object.keys(data).length === 0) {
    return { current: 0, longest: 0, lastLogDate: "" };
  }
  const d = data as Record<string, unknown>;
  return {
    current: Number(d.current ?? 0),
    longest: Number(d.longest ?? 0),
    lastLogDate: d.lastLogDate ? String(d.lastLogDate) : "",
  };
}

export async function updateStreak(userId: string, todayLocalDate: string): Promise<StreakInfo> {
  const redis = getRedis();
  const streak = await getStreak(userId);

  if (streak.lastLogDate === todayLocalDate) {
    return streak;
  }

  const yesterdayStr = format(subDays(parseISO(todayLocalDate), 1), "yyyy-MM-dd");

  let newCurrent: number;
  if (streak.lastLogDate === yesterdayStr) {
    newCurrent = streak.current + 1;
  } else {
    newCurrent = 1;
  }

  const newLongest = Math.max(streak.longest, newCurrent);

  await redis.hset(streakKey(userId), {
    current: String(newCurrent),
    longest: String(newLongest),
    lastLogDate: todayLocalDate,
  });

  return { current: newCurrent, longest: newLongest, lastLogDate: todayLocalDate };
}
