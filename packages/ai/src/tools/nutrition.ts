import type { NutritionInfo } from "@caltext/shared";
import { tool } from "ai";
import { chatModel } from "../model";
import { generateStructured } from "../structured";
import { log } from "evlog";
import { z } from "zod";

const estimateSchema = z.object({
  calories: z.number().describe("Estimated kcal"),
  protein: z.number().describe("Estimated grams of protein"),
  carbs: z.number().describe("Estimated grams of carbohydrates"),
  fat: z.number().describe("Estimated grams of fat"),
  fiber: z.number().describe("Estimated grams of fiber"),
});

export const lookupNutrition = tool({
  description:
    "Estimate nutrition data for a food item using AI. Returns calories, protein, carbs, fat, and fiber per the specified gram amount. Always use English food names for best accuracy.",
  inputSchema: z.object({
    foodName: z.string().describe("Food name in English, e.g. 'grilled chicken breast'"),
    grams: z.number().describe("Amount in grams to calculate nutrition for"),
    preparationMethod: z
      .string()
      .optional()
      .describe("How the food is prepared, to refine the estimate"),
  }),
  execute: async ({ foodName, grams, preparationMethod }): Promise<NutritionInfo> => {
    const desc = preparationMethod ? `${foodName}, ${preparationMethod}` : foodName;

    let output: z.infer<typeof estimateSchema>;
    try {
      output = await generateStructured({
        model: chatModel(),
        schema: estimateSchema,
        prompt: `Estimate nutrition for ${grams}g of ${desc}. Use your knowledge of typical nutritional values. Return kcal, protein, carbs, fat, fiber in grams. Be accurate -- these are for calorie tracking.`,
      });
    } catch {
      return { matchedName: foodName, calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 };
    }

    const info: NutritionInfo = {
      matchedName: foodName,
      calories: Math.round(output.calories),
      protein: Math.round(output.protein * 10) / 10,
      carbs: Math.round(output.carbs * 10) / 10,
      fat: Math.round(output.fat * 10) / 10,
      fiber: Math.round(output.fiber * 10) / 10,
    };

    log.info({
      tool: "lookupNutrition",
      food: foodName,
      grams,
      prep: preparationMethod ?? null,
      kcal: info.calories,
      p: info.protein,
      c: info.carbs,
      f: info.fat,
    });

    return info;
  },
});
