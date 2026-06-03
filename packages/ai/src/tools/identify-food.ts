import { tool } from "ai";
import { visionModels } from "../model";
import { ciEnum, generateStructuredAcross } from "../structured";
import { log } from "evlog";
import { z } from "zod";

export const nutritionLabelSchema = z.object({
  productName: z.string().describe("Product name as shown on packaging"),
  servingSize: z.string().describe("Serving size as printed, e.g. '1 bottle (500ml)' or '100g'"),
  servingGrams: z.number().describe("Serving size converted to grams"),
  calories: z.number(),
  protein: z.number(),
  carbs: z.number(),
  fat: z.number(),
  fiber: z.number(),
});

export const foodIdentificationSchema = z.object({
  items: z.array(
    z.object({
      name: z.string().describe("Common food name, e.g. 'grilled chicken breast'"),
      estimatedGrams: z.number().describe("Estimated weight in grams based on visual cues"),
      preparationMethod: z
        .string()
        .describe("How it appears prepared: raw, grilled, fried, boiled, etc."),
      confidence: ciEnum(["high", "medium", "low"]),
      notes: z
        .string()
        .nullish()
        .describe("Anything uncertain, e.g. 'could be diet or regular'. Null if nothing to note."),
      nutrition: z
        .object({
          calories: z.number().describe("Estimated kcal for this item at the estimated weight"),
          protein: z.number().describe("Estimated grams of protein"),
          carbs: z.number().describe("Estimated grams of carbohydrates"),
          fat: z.number().describe("Estimated grams of fat"),
          fiber: z.number().describe("Estimated grams of fiber"),
        })
        .describe("Nutrition estimate for this item at the estimated gram weight"),
    }),
  ),
  sceneContext: z
    .string()
    .nullish()
    .describe("Visible reference objects: plate size, utensils, hands. Null if none."),
  nutritionLabel: nutritionLabelSchema
    .nullish()
    .describe(
      "Present only when a nutrition facts label is visible on a packaged product. Do NOT populate items when this is set. Null for plates of food.",
    ),
});

export type FoodIdentification = z.infer<typeof foodIdentificationSchema>;

export const FOOD_IDENTIFICATION_PROMPT = `Analyze this food photo. There are two modes depending on what you see:

MODE 1 — PLATE OF FOOD (no packaging):
Identify each food item, estimate weight in grams, and estimate nutrition (calories, protein, carbs, fat, fiber) for that weight.

Use visible objects as size references:
- Standard dinner plate = ~26cm diameter
- Standard fork = ~19cm
- If a hand is visible, use it for scale

For each item, estimate the weight in grams. Be conservative -- it's better to slightly overestimate than underestimate. If you're uncertain about an item (e.g., "is that mayo or yogurt?"), flag it with low confidence and a note.

For nutrition estimates, use your knowledge of typical nutritional values per 100g and scale to the estimated gram weight. Be accurate -- these are for calorie tracking.

Return items in the "items" array with their nutrition. Leave "nutritionLabel" empty.

MODE 2 — PACKAGED PRODUCT (bottle, can, box, jar, bag, protein bar, etc.):
If you see a packaged food or drink product:
- Read the product name from the packaging
- If a nutrition facts label is visible, read the EXACT values printed on it: calories, protein, carbs, fat, fiber, and serving size
- Convert the serving size to grams (e.g. "250ml milk" ≈ 258g, "1 bar (40g)" = 40g)
- Return these in the "nutritionLabel" field. Leave the "items" array empty.
- If the nutrition label is not visible or too blurry to read, identify the product by name and return it as a single item in the "items" array with your best weight and nutrition estimate.

Return your analysis as structured JSON.`;

export function createIdentifyFoodTool(contextImageUrl?: string) {
  return tool({
    description:
      "Analyze the user's food photo to identify items, estimate portion sizes, and estimate nutrition (calories + macros) per item. Also reads nutrition facts from packaged product labels. The image is provided automatically -- no parameters needed.",
    inputSchema: z.object({}),
    execute: async () => {
      if (!contextImageUrl) {
        return { error: "No image provided", items: [] };
      }

      try {
        let dataUrl: string;
        if (contextImageUrl.startsWith("data:")) {
          dataUrl = contextImageUrl;
        } else {
          const imageResponse = await fetch(contextImageUrl);
          if (!imageResponse.ok) {
            return { error: `Could not fetch image (${imageResponse.status})`, items: [] };
          }
          const buffer = await imageResponse.arrayBuffer();
          const base64 = Buffer.from(buffer).toString("base64");
          const contentType = imageResponse.headers.get("content-type") ?? "image/jpeg";
          dataUrl = `data:${contentType};base64,${base64}`;
        }

        const models = visionModels();
        let usedModelIndex = 0;
        const obj = await generateStructuredAcross(
          models,
          {
          schema: foodIdentificationSchema,
          // A real plate has a handful of items; cap output so a degenerate
          // model can't run away generating hundreds of repeated lines.
          maxOutputTokens: 2000,
          // Same-model retries rarely fix a parse failure; fail over to the next
          // vision model quickly instead (the list provides the redundancy).
          maxRetries: 1,
          // Gemini 2.5 Flash is a thinking model: by default it spends hundreds
          // of tokens "thinking" before answering, which eats into the output
          // budget above (risking truncated JSON) and burns its scarce free
          // quota. Disable it so the whole budget goes to the structured result.
          // Ignored by non-Google providers (Groq/OpenRouter vision fallbacks).
          providerOptions: { google: { thinkingConfig: { thinkingBudget: 0 } } },
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: FOOD_IDENTIFICATION_PROMPT },
                { type: "image", image: new URL(dataUrl) },
              ],
            },
          ],
          },
          (i) => {
            usedModelIndex = i;
          },
        );

        log.info({
          tool: "identifyFood",
          visionModelIndex: usedModelIndex,
          visionModelCount: models.length,
          itemCount: obj.items.length,
          items: obj.items.map((i) => ({
            name: i.name,
            grams: i.estimatedGrams,
            prep: i.preparationMethod,
            confidence: i.confidence,
            kcal: i.nutrition.calories,
            p: i.nutrition.protein,
            c: i.nutrition.carbs,
            f: i.nutrition.fat,
            ...(i.notes ? { notes: i.notes } : {}),
          })),
          sceneContext: obj.sceneContext,
          hasNutritionLabel: !!obj.nutritionLabel,
          ...(obj.nutritionLabel ? { label: obj.nutritionLabel } : {}),
        });

        return obj;
      } catch (err) {
        log.error({ tool: "identifyFood", err: String(err) });
        return { error: String(err), items: [] };
      }
    },
  });
}
