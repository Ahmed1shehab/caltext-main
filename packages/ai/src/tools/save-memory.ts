import { saveMemory } from "@caltext/db";
import { tool } from "ai";
import { z } from "zod";

export const saveMemoryTool = tool({
  description:
    "Save a user preference, fact, or dietary note for future reference. Use this when the user mentions dietary restrictions, allergies, food preferences, favorite meals, or any personal detail worth remembering.",
  inputSchema: z.object({
    userId: z.string(),
    key: z
      .string()
      .describe(
        "Short descriptive label like 'diet', 'allergies', 'favorite_breakfast', 'coffee_order', 'preferred_units'",
      ),
    value: z.string().describe("The fact to remember"),
  }),
  execute: async ({ userId, key, value }) => {
    await saveMemory(userId, key, value);
    return { saved: true, key, value };
  },
});
