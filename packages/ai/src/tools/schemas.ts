import { z } from "zod";

export const mealItemSchema = z.object({
  name: z.string(),
  estimatedGrams: z.number(),
  preparationMethod: z.string(),
  confidence: z.enum(["high", "medium", "low"]),
  notes: z.string().optional(),
  nutrition: z.object({
    matchedName: z.string(),
    calories: z.number(),
    protein: z.number(),
    carbs: z.number(),
    fat: z.number(),
    fiber: z.number(),
  }),
});

export type MealItemInput = z.infer<typeof mealItemSchema>;

export function aggregateMealTotals(
  items: {
    nutrition: { calories: number; protein: number; carbs: number; fat: number; fiber: number };
  }[],
) {
  return {
    totalCalories: items.reduce((s, i) => s + i.nutrition.calories, 0),
    totalProtein: items.reduce((s, i) => s + i.nutrition.protein, 0),
    totalCarbs: items.reduce((s, i) => s + i.nutrition.carbs, 0),
    totalFat: items.reduce((s, i) => s + i.nutrition.fat, 0),
    totalFiber: items.reduce((s, i) => s + i.nutrition.fiber, 0),
  };
}
