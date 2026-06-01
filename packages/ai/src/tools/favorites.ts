import {
  getAllFavorites,
  getFavorite,
  saveFavorite,
  saveMeal,
  updateDailyTotals,
} from "@caltext/db";
import type { MealItem } from "@caltext/shared";
import { localDateString } from "@caltext/shared";
import { tool } from "ai";
import { z } from "zod";
import { aggregateMealTotals, mealItemSchema } from "./schemas";

export const saveFavoriteTool = tool({
  description:
    "Save a meal as a favorite for quick re-logging. Use when the user asks to save a meal or when they've logged the same meal multiple times.",
  inputSchema: z.object({
    userId: z.string(),
    name: z.string().describe("Friendly name for the favorite, e.g. 'morning oatmeal'"),
    items: z.array(mealItemSchema),
  }),
  execute: async ({ userId, name, items }) => {
    await saveFavorite(userId, name, items as MealItem[]);
    return { saved: true, name };
  },
});

export const listFavoritesTool = tool({
  description: "List all saved favorite meals for the user.",
  inputSchema: z.object({
    userId: z.string(),
  }),
  execute: async ({ userId }) => {
    const names = await getAllFavorites(userId);
    if (names.length === 0) {
      return { favorites: [], message: "No favorites saved yet." };
    }
    return { favorites: names };
  },
});

export const logFavoriteTool = tool({
  description:
    "Log a previously saved favorite meal. Looks up the stored nutrition and saves it as today's meal.",
  inputSchema: z.object({
    userId: z.string(),
    timezone: z.string(),
    name: z.string().describe("Name of the favorite to log"),
  }),
  execute: async ({ userId, timezone, name }) => {
    const items = await getFavorite(userId, name);
    if (!items) {
      return { logged: false, message: `No favorite found with name "${name}".` };
    }

    const localDate = localDateString(timezone);
    const id = `meal_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const totals = aggregateMealTotals(items);

    await saveMeal({
      id,
      userId,
      items,
      ...totals,
      source: "manual",
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
      logged: true,
      mealId: id,
      name,
      totalCalories: totals.totalCalories,
      totalProtein: Math.round(totals.totalProtein * 10) / 10,
      totalCarbs: Math.round(totals.totalCarbs * 10) / 10,
      totalFat: Math.round(totals.totalFat * 10) / 10,
    };
  },
});
