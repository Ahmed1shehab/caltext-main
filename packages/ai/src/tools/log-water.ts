import { getWaterLog, logWater } from "@caltext/db";
import { DEFAULT_WATER_TARGET_ML, localDateString } from "@caltext/shared";
import { tool } from "ai";
import { z } from "zod";

export const logWaterTool = tool({
  description:
    "Log water intake for the user. Use 250 for a glass, 500 for a bottle, 350 for a can.",
  inputSchema: z.object({
    userId: z.string(),
    timezone: z.string(),
    amountMl: z.number().describe("Amount of water in milliliters"),
  }),
  execute: async ({ userId, timezone, amountMl }) => {
    const localDate = localDateString(timezone);
    await logWater(userId, localDate, amountMl);
    const updated = await getWaterLog(userId, localDate);
    const remaining = Math.max(0, DEFAULT_WATER_TARGET_ML - updated.totalMl);

    return {
      logged: amountMl,
      totalMl: updated.totalMl,
      glasses: updated.glasses,
      remainingMl: remaining,
      targetMl: DEFAULT_WATER_TARGET_ML,
    };
  },
});

export const getWaterLogTool = tool({
  description: "Get the user's water intake for today.",
  inputSchema: z.object({
    userId: z.string(),
    timezone: z.string(),
  }),
  execute: async ({ userId, timezone }) => {
    const localDate = localDateString(timezone);
    const log = await getWaterLog(userId, localDate);
    return {
      totalMl: log.totalMl,
      glasses: log.glasses,
      remainingMl: Math.max(0, DEFAULT_WATER_TARGET_ML - log.totalMl),
      targetMl: DEFAULT_WATER_TARGET_ML,
    };
  },
});
