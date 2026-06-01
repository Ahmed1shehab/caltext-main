import { encrypt } from "@caltext/shared";
import { createLogger, type RequestLogger } from "evlog";
import { normalizeImageUrl } from "@/image";
import { acquireSlot } from "@/redis-utils";
import { routeMessage } from "@/router";
import { sendMessage, sendTyping } from "@/sendblue";

const MAX_CACHE_SIZE = 500;
const encryptCache = new Map<string, string>();
async function cachedEncrypt(phone: string): Promise<string> {
  let enc = encryptCache.get(phone);
  if (!enc) {
    enc = await encrypt(phone);
    if (encryptCache.size >= MAX_CACHE_SIZE) encryptCache.clear();
    encryptCache.set(phone, enc);
  }
  return enc;
}

export async function handleIncoming(
  phone: string,
  text: string,
  rawImageUrl?: string,
  messageId?: string,
) {
  const log: RequestLogger = createLogger({
    scope: "message",
    phone: phone.slice(-4),
  });

  const encryptedPhone = await cachedEncrypt(phone);
  const slot = await acquireSlot(encryptedPhone, messageId);

  if (slot.status !== "acquired") {
    log.set({ skipped: slot.status });
    log.emit();
    return;
  }

  try {
    log.set({ input: { text: text.slice(0, 80), hasImage: !!rawImageUrl } });
    sendTyping(phone);

    const imageUrl = rawImageUrl ? await normalizeImageUrl(rawImageUrl, log) : undefined;

    const replies = await routeMessage(log, encryptedPhone, phone, text, imageUrl);
    for (const reply of replies) {
      await sendMessage(phone, reply);
    }

    log.set({ output: { replies: replies.length } });
  } catch (error) {
    log.error(error as Error);
    try {
      await sendMessage(phone, "Oops, something went wrong. Try again in a sec! 🙏");
    } catch {
      // swallow send failure for error message
    }
  } finally {
    await slot.release();
    log.emit();
  }
}
