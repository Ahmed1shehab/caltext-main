import { recallAllMemories } from "@caltext/db";
import { tool } from "ai";
import { z } from "zod";

export const recallMemoryTool = tool({
  description:
    "Recall all saved preferences and facts about this user. Use this to get context before responding, especially about dietary restrictions, allergies, and preferences.",
  inputSchema: z.object({
    userId: z.string(),
  }),
  execute: async ({ userId }) => {
    const memories = await recallAllMemories(userId);
    if (Object.keys(memories).length === 0) {
      return { memories: null, message: "No saved memories for this user yet." };
    }
    return { memories };
  },
});
