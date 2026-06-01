import { env } from "./env";

const BASE = "https://api.sendblue.com/api";
const authHeaders = {
  "Content-Type": "application/json",
  "sb-api-key-id": env.SENDBLUE_API_KEY,
  "sb-api-secret-key": env.SENDBLUE_API_SECRET,
};

async function sendblueRequest(path: string, body: Record<string, unknown>): Promise<void> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Sendblue ${path} ${res.status}: ${text}`);
  }
}

export async function sendMessage(phone: string, text: string): Promise<void> {
  await sendblueRequest("/send-message", {
    number: phone,
    from_number: env.SENDBLUE_FROM_NUMBER,
    content: text,
  });
}

export async function sendTyping(phone: string): Promise<void> {
  await sendblueRequest("/send-typing-indicator", {
    number: phone,
    from_number: env.SENDBLUE_FROM_NUMBER,
  });
}

export async function markRead(phone: string): Promise<void> {
  await sendblueRequest("/mark-read", {
    number: phone,
    from_number: env.SENDBLUE_FROM_NUMBER,
  });
}
