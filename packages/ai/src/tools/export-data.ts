import {
  getAllFavorites,
  getConversationMessages,
  getDailyLog,
  getRedis,
  getStreak,
  getUser,
  getWaterLog,
  getWeightHistory,
  recallAllMemories,
} from "@caltext/db";
import { encryptContent, localDateString } from "@caltext/shared";
import { tool } from "ai";
import { format, parseISO, subDays } from "date-fns";
import { z } from "zod";

export const exportDataTool = tool({
  description:
    "Export all of the user's data in a machine-readable format. Use when the user asks for their data, a data export, or GDPR data access.",
  inputSchema: z.object({
    userId: z.string(),
    timezone: z.string(),
  }),
  execute: async ({ userId, timezone }) => {
    const [user, memories, streak, weightHistory, favorites, messages] = await Promise.all([
      getUser(userId),
      recallAllMemories(userId),
      getStreak(userId),
      getWeightHistory(userId, 365),
      getAllFavorites(userId),
      getConversationMessages(userId),
    ]);

    if (!user) return { exported: false, message: "User not found." };

    const localDate = localDateString(timezone);
    const endDate = parseISO(localDate);
    const dailyLogs: Record<string, unknown> = {};
    const waterLogs: Record<string, unknown> = {};
    for (let i = 0; i < 90; i++) {
      const dateStr = format(subDays(endDate, i), "yyyy-MM-dd");
      const log = await getDailyLog(userId, dateStr);
      if (log.mealCount > 0) {
        dailyLogs[dateStr] = log;
      }
      const water = await getWaterLog(userId, dateStr);
      if (water.totalMl > 0) {
        waterLogs[dateStr] = water;
      }
    }

    const exportData = {
      exportedAt: new Date().toISOString(),
      profile: { ...user, phone: "[encrypted]" },
      dailyLogs,
      waterLogs,
      weightHistory,
      streak,
      memories,
      favorites,
      recentMessages: messages,
    };

    const redis = getRedis();
    const blob = await encryptContent(JSON.stringify(exportData));
    await redis.set(`export:${userId}`, blob, { ex: 86400 });

    const mealDays = Object.keys(dailyLogs).length;
    const totalMeals = Object.values(dailyLogs).reduce(
      (sum: number, log) => sum + ((log as { mealCount: number }).mealCount ?? 0),
      0,
    );

    return {
      exported: true,
      summary: `Exported ${mealDays} days of meal data (${totalMeals} meals), ${weightHistory.length} weight entries, ${Object.keys(waterLogs).length} days of water logs, ${favorites.length} favorites, and ${Object.keys(memories).length} saved preferences.`,
      availableFor: "24 hours",
    };
  },
});
