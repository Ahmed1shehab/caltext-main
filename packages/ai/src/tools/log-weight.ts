import { getWeightHistory, logWeight, updateUser } from "@caltext/db";
import { localDateString } from "@caltext/shared";
import { tool } from "ai";
import { z } from "zod";

export const logWeightTool = tool({
  description: "Log the user's current weight. Also updates their profile and returns trend data.",
  inputSchema: z.object({
    userId: z.string(),
    timezone: z.string(),
    weightKg: z.number().describe("Weight in kilograms"),
  }),
  execute: async ({ userId, timezone, weightKg }) => {
    const localDate = localDateString(timezone);
    await logWeight(userId, weightKg, localDate);
    await updateUser(userId, { weightKg: String(weightKg) });

    const history = await getWeightHistory(userId, 7);
    const previous = history.length > 1 ? history[1]! : null;
    const change = previous ? weightKg - previous.weightKg : null;

    return {
      currentKg: weightKg,
      date: localDate,
      changeFromLast: change !== null ? Math.round(change * 10) / 10 : null,
      recentEntries: history.slice(0, 7),
    };
  },
});

export const getWeightHistoryTool = tool({
  description: "Get the user's weight history for trend analysis.",
  inputSchema: z.object({
    userId: z.string(),
  }),
  execute: async ({ userId }) => {
    const history = await getWeightHistory(userId, 30);
    if (history.length === 0) {
      return { entries: [], message: "No weight entries logged yet." };
    }

    const latest = history[0]!;
    const oldest = history[history.length - 1]!;
    const totalChange = Math.round((latest.weightKg - oldest.weightKg) * 10) / 10;

    return {
      entries: history,
      totalChange,
      period: `${oldest.date} to ${latest.date}`,
    };
  },
});
