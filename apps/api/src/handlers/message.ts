import type { ModelMessage } from "@caltext/ai";
import { buildSystemPrompt, chatModel, createCaltextAgent } from "@caltext/ai";
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

// Cap how many prior messages we actually send to the model each turn. The full
// history (up to MAX_CONVERSATION_MESSAGES = 40) is still persisted for context,
// but re-sending all 40 on every call multiplied by the agent's 3-step tool loop
// blows small per-minute token budgets (e.g. Groq's free tier = 12k TPM), which
// surfaces to the user as "Oops". A sliding window keeps recent context cheap.
const MAX_HISTORY_MESSAGES = 14;

function windowHistory(messages: ModelMessage[]): ModelMessage[] {
  if (messages.length <= MAX_HISTORY_MESSAGES) return messages;
  const window = messages.slice(-MAX_HISTORY_MESSAGES);
  // Never start the window on an assistant/tool message: a leading tool result
  // with no preceding tool call is an orphan that some providers reject. Begin
  // at the first user turn inside the window.
  const firstUser = window.findIndex((m) => m.role === "user");
  return firstUser > 0 ? window.slice(firstUser) : window;
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
  // The agent ONLY orchestrates tool calls — it never sees the photo itself
  // (buildUserMessage replaces an image with a text placeholder, and the actual
  // image read happens inside the identifyFood tool via chatModel(true)). So the
  // agent must always run on the text model, which is good at tool calling.
  // Running it on the vision model (e.g. Groq llama-4-scout) made it emit broken
  // tool calls as plain text — '{"type":"function","name":"identifyFood"}' — to
  // the user instead of executing them.
  const model = ai.wrap(chatModel(false));

  const systemPrompt = buildSystemPrompt(ctx);
  const userMessage = buildUserMessage(text, hasImage);
  const agent = createCaltextAgent(systemPrompt, {
    userId,
    timezone: user.timezone,
    hasImage,
    imageUrl,
    model,
  });

  // Window only what we send to the model; full history is still saved below.
  const allMessages: ModelMessage[] = [...windowHistory(conversationHistory), userMessage];
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
