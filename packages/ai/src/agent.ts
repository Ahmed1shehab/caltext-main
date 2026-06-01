import { openai } from "@ai-sdk/openai";
import type { LanguageModelV3 } from "@ai-sdk/provider";
import { type ModelMessage, stepCountIs, type Tool, ToolLoopAgent } from "ai";
import { deleteAccountTool } from "./tools/delete-account";
import { deleteMealTool } from "./tools/delete-meal";
import { exportDataTool } from "./tools/export-data";
import { listFavoritesTool, logFavoriteTool, saveFavoriteTool } from "./tools/favorites";
import { getDailyLogTool, getWeeklyLogTool } from "./tools/get-history";
import { getUserProfile } from "./tools/get-profile";
import { createIdentifyFoodTool } from "./tools/identify-food";
import { logMeal } from "./tools/log-meal";
import { getWaterLogTool, logWaterTool } from "./tools/log-water";
import { getWeightHistoryTool, logWeightTool } from "./tools/log-weight";
import { lookupNutrition } from "./tools/nutrition";
import { recallMemoryTool } from "./tools/recall-memory";
import { saveMemoryTool } from "./tools/save-memory";
import { getRemindersTool, setRemindersTool } from "./tools/set-reminders";
import { updateProfileTool } from "./tools/update-profile";

export interface AgentSecurityContext {
  userId: string;
  timezone: string;
}

function withContext<T extends Tool>(t: T, ctx: AgentSecurityContext): T {
  return {
    ...t,
    execute: (args: Record<string, unknown>, options: unknown) =>
      t.execute!({ ...args, userId: ctx.userId, timezone: ctx.timezone }, options as never),
  } as T;
}

export interface AgentOptions extends AgentSecurityContext {
  hasImage?: boolean;
  imageUrl?: string;
  model?: LanguageModelV3;
}

export function createCaltextAgent(systemPrompt: string, ctx: AgentOptions) {
  const model = ctx.model ?? openai(ctx.hasImage ? "gpt-4.1" : "gpt-4.1-mini");

  return new ToolLoopAgent({
    model,
    instructions: systemPrompt,
    tools: {
      identifyFood: createIdentifyFoodTool(ctx.imageUrl),
      lookupNutrition,
      logMeal: withContext(logMeal, ctx),
      deleteMeal: withContext(deleteMealTool, ctx),
      getDailyLog: withContext(getDailyLogTool, ctx),
      getWeeklyLog: withContext(getWeeklyLogTool, ctx),
      getUserProfile: withContext(getUserProfile, ctx),
      updateProfile: withContext(updateProfileTool, ctx),
      logWater: withContext(logWaterTool, ctx),
      getWaterLog: withContext(getWaterLogTool, ctx),
      logWeight: withContext(logWeightTool, ctx),
      getWeightHistory: withContext(getWeightHistoryTool, ctx),
      setReminders: withContext(setRemindersTool, ctx),
      getReminders: withContext(getRemindersTool, ctx),
      saveFavorite: withContext(saveFavoriteTool, ctx),
      listFavorites: withContext(listFavoritesTool, ctx),
      logFavorite: withContext(logFavoriteTool, ctx),
      exportData: withContext(exportDataTool, ctx),
      deleteAccount: withContext(deleteAccountTool, ctx),
      saveMemory: withContext(saveMemoryTool, ctx),
      recallMemory: withContext(recallMemoryTool, ctx),
    },
    stopWhen: stepCountIs(8),
  });
}

export type { ModelMessage };
