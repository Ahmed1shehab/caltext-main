import { saveMeal, updateDailyTotals } from "@caltext/db";
import { localDateString } from "@caltext/shared";
import { tool } from "ai";
import { z } from "zod";
import { aggregateMealTotals, mealItemSchema } from "./schemas";

export const logMeal = tool({
  description:
    "Log a meal entry with nutrition data to the user's daily log. Call this after identifying food and looking up nutrition.",
  inputSchema: z.object({
    userId: z.string(),
    timezone: z.string(),
    mealName: z
      .string()
      .describe(
        "Short descriptive name for the meal, e.g. 'Greek plate', 'Morning oatmeal', 'Chicken salad lunch'",
      ),
    items: z.array(mealItemSchema),
    photoUrl: z.string().optional(),
    source: z.enum(["photo", "text", "manual"]),
  }),
  execute: async ({ userId, timezone, mealName, items, photoUrl, source }) => {
    const localDate = localDateString(timezone);
    const id = `meal_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const totals = aggregateMealTotals(items);

    await saveMeal({
      id,
      userId,
      name: mealName,
      items,
      ...totals,
      photoUrl,
      source,
      timestamp: new Date().toISOString(),
      localDate,
    });

    await updateDailyTotals(
      userId,
      localDate,
      totals.totalCalories,
      totals.totalProtein,
      totals.totalCarbs,
      totals.totalFat,
      totals.totalFiber,
    );

    return {
      mealId: id,
      totalCalories: totals.totalCalories,
      totalProtein: Math.round(totals.totalProtein * 10) / 10,
      totalCarbs: Math.round(totals.totalCarbs * 10) / 10,
      totalFat: Math.round(totals.totalFat * 10) / 10,
      totalFiber: Math.round(totals.totalFiber * 10) / 10,
      localDate,
    };
  },
});
