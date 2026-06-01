import { openai } from "@ai-sdk/openai";
import type { ModelMessage } from "@caltext/ai";
import { buildSystemPrompt, createCaltextAgent } from "@caltext/ai";
import {
  getConversationMessages,
  getDailyLog,
  getStreak,
  getWaterLog,
  recallAllMemories,
  saveConversationMessages,
} from "@caltext/db";
import type { AgentContext, UserProfile } from "@caltext/shared";
import { getLocaleName, localDateString } from "@caltext/shared";
import { pruneMessages } from "ai";
import type { RequestLogger } from "evlog";
import { createAILogger } from "evlog/ai";

function buildUserMessage(text: string, hasImage?: boolean): ModelMessage {
  if (hasImage) {
    return {
      role: "user",
      content: text ? `${text}\n\n[User attached a food photo]` : "[User sent a food photo]",
    };
  }

  return { role: "user", content: text };
}

function stripImagesFromHistory(messages: ModelMessage[]): ModelMessage[] {
  return messages.map((msg) => {
    if (msg.role !== "user" || typeof msg.content === "string") return msg;
    if (!Array.isArray(msg.content)) return msg;

    const textParts = msg.content.filter((p) => p.type === "text");

    if (textParts.length === 0) {
      return { ...msg, content: "[sent an image]" };
    }

    return { ...msg, content: textParts };
  });
}

export async function handleMessage(
  log: RequestLogger,
  user: UserProfile,
  text: string,
  imageUrl?: string,
): Promise<string | null> {
  const userId = user.id;
  const [rawHistory, memories, streak] = await Promise.all([
    getConversationMessages<ModelMessage>(userId),
    recallAllMemories(userId),
    getStreak(userId),
  ]);
  const conversationHistory = stripImagesFromHistory(rawHistory);

  const localDate = localDateString(user.timezone);
  const [todayLog, todayWater] = await Promise.all([
    getDailyLog(userId, localDate),
    getWaterLog(userId, localDate),
  ]);

  const hasImage = !!imageUrl;
  log.set({
    user: { name: user.name, locale: user.locale, timezone: user.timezone },
    context: {
      localDate,
      hasImage,
      historyLength: conversationHistory.length,
      todayMeals: todayLog.mealCount,
      streak: streak.current,
    },
  });

  const ctx: AgentContext = {
    userId,
    userName: user.name,
    localeName: getLocaleName(user.locale),
    locale: user.locale,
    timezone: user.timezone,
    localDate,
    dailyCalorieTarget: user.dailyCalorieTarget,
    userProfile: user,
    memories: Object.keys(memories).length > 0 ? memories : null,
    todayLog: todayLog.mealCount > 0 ? todayLog : null,
    streak: streak.current > 0 ? streak.current : null,
    todayWater: todayWater.totalMl > 0 ? todayWater : null,
    imageUrl,
  };

  const ai = createAILogger(log, { toolInputs: { maxLength: 200 } });
  const model = ai.wrap(openai(hasImage ? "gpt-4.1" : "gpt-4.1-mini"));

  const systemPrompt = buildSystemPrompt(ctx);
  const userMessage = buildUserMessage(text, hasImage);
  const agent = createCaltextAgent(systemPrompt, {
    userId,
    timezone: user.timezone,
    hasImage,
    imageUrl,
    model,
  });

  const allMessages: ModelMessage[] = [...conversationHistory, userMessage];
  const messages = pruneMessages({
    messages: allMessages,
    toolCalls: "before-last-2-messages",
    reasoning: "before-last-message",
    emptyMessages: "remove",
  });

  const result = await agent.generate({ messages });

  const toSave = stripImagesFromHistory(
    pruneMessages({
      messages: [
        ...conversationHistory,
        userMessage,
        ...(result.response.messages as ModelMessage[]),
      ],
      toolCalls: "before-last-2-messages",
      emptyMessages: "remove",
    }),
  );
  await saveConversationMessages(userId, toSave);

  return result.text || null;
}
