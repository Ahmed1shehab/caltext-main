import { env } from "@caltext/shared";

export { markRead, sendMessage, sendTyping } from "@caltext/shared";

// ── Webhook parsing (API-specific) ──────────────────────

export interface InboundMessage {
  phone: string;
  text: string;
  imageUrl: string | undefined;
  messageId: string | undefined;
}

const SECRET_HEADERS = ["x-webhook-secret", "x-sendblue-signature", "sb-webhook-secret"];

export function parseInbound(headers: Headers, body: unknown): InboundMessage | null {
  const secret = SECRET_HEADERS.reduce<string | null>((v, h) => v ?? headers.get(h), null);
  if (secret && secret !== env.SENDBLUE_WEBHOOK_SECRET) return null;

  const b = body as Record<string, unknown>;
  if (b.is_outbound || b.status !== "RECEIVED") return null;

  const phone = b.number as string | undefined;
  if (!phone) return null;

  const text = (b.content as string) ?? "";
  const imageUrl = (b.media_url as string) || undefined;
  if (!text && !imageUrl) return null;

  return { phone, text, imageUrl, messageId: b.message_handle as string | undefined };
}
