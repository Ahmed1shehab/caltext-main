import { decrypt, encryptContent } from "@caltext/shared";
import { getRedis } from "./client";

const messagesKey = (userId: string) => `messages:${userId}`;

const MAX_CONVERSATION_MESSAGES = 40;

export async function saveConversationMessages(userId: string, messages: unknown[]): Promise<void> {
  const redis = getRedis();
  const json = JSON.stringify(messages.slice(-MAX_CONVERSATION_MESSAGES));
  const encrypted = await encryptContent(json);
  await redis.set(messagesKey(userId), encrypted);
}

export async function getConversationMessages<T = unknown>(userId: string): Promise<T[]> {
  const redis = getRedis();
  const raw = await redis.get(messagesKey(userId));
  if (!raw) return [];
  if (Array.isArray(raw)) return raw as T[];
  if (typeof raw !== "string") return [];
  const decrypted = await decrypt(raw);
  return JSON.parse(decrypted) as T[];
}

export async function deleteAllMessages(userId: string): Promise<void> {
  const redis = getRedis();
  await redis.del(messagesKey(userId));
}
