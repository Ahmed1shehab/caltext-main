import { getDailyLog, getWeeklyLogs } from "@caltext/db";
import { tool } from "ai";
import { z } from "zod";

export const getDailyLogTool = tool({
  description:
    "Get today's meal log with running totals. Always returns TODAY's data -- no date parameter needed.",
  inputSchema: z.object({
    userId: z.string(),
    localDate: z.string(),
  }),
  execute: async ({ userId, localDate }) => {
    return await getDailyLog(userId, localDate);
  },
});

export const getWeeklyLogTool = tool({
  description:
    "Get the past 7 days of meal logs for the user. Useful for weekly summaries and trends.",
  inputSchema: z.object({
    userId: z.string(),
    endDate: z.string().describe("The end date in YYYY-MM-DD format"),
  }),
  execute: async ({ userId, endDate }) => {
    return await getWeeklyLogs(userId, endDate);
  },
});
