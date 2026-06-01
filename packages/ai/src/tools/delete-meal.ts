import { deleteMeal, getMeal, subtractDailyTotals } from "@caltext/db";
import { tool } from "ai";
import { z } from "zod";

export const deleteMealTool = tool({
  description:
    "Delete a previously logged meal and subtract its calories/macros from the daily totals. Use when the user wants to remove or undo a meal.",
  inputSchema: z.object({
    userId: z.string(),
    mealId: z.string().describe("The meal ID to delete, e.g. 'meal_1234_abc'"),
  }),
  execute: async ({ userId, mealId }) => {
    const meal = await getMeal(mealId);
    if (!meal) {
      return { deleted: false, message: "Meal not found." };
    }
    if (meal.userId !== userId) {
      return { deleted: false, message: "Meal not found." };
    }

    await deleteMeal(mealId, userId, meal.localDate);
    await subtractDailyTotals(
      userId,
      meal.localDate,
      meal.totalCalories,
      meal.totalProtein,
      meal.totalCarbs,
      meal.totalFat,
      meal.totalFiber,
    );

    const itemNames = meal.items.map((i) => i.name).join(", ");
    return {
      deleted: true,
      removedCalories: meal.totalCalories,
      removedItems: itemNames,
      localDate: meal.localDate,
    };
  },
});
