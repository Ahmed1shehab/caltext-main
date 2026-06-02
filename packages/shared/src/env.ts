import { createEnv } from "@t3-oss/env-core";
import { upstashRedis, vercel } from "@t3-oss/env-core/presets-zod";
import { z } from "zod";

export const env = createEnv({
  server: {
    SENDBLUE_API_KEY: z.string().min(1),
    SENDBLUE_API_SECRET: z.string().min(1),
    SENDBLUE_FROM_NUMBER: z.string().min(1),
    SENDBLUE_WEBHOOK_SECRET: z.string().min(1),
    REDIS_URL: z.string().min(1),
    // Which LLM provider to use. If unset, auto-detected from whichever API key
    // is present (openrouter > groq > nvidia > gemini > zhipu).
    // `.trim()` guards against trailing whitespace/CR that the Vercel CLI can
    // leave when a value is piped in on Windows ("groq\r" would fail the enum).
    AI_PROVIDER: z
      .string()
      .trim()
      .pipe(z.enum(["openrouter", "groq", "gemini", "nvidia", "zhipu"]))
      .optional(),
    // OpenRouter (free models, email signup, OpenAI-compatible). Recommended.
    // API keys use `.trim()` too: a stray CR in a secret silently breaks auth.
    OPENROUTER_API_KEY: z.string().trim().optional(),
    OPENROUTER_BASE_URL: z.string().url().optional(),
    OPENROUTER_TEXT_MODEL: z.string().optional(),
    OPENROUTER_VISION_MODEL: z.string().optional(),
    // Groq (free, fast, email signup). Split models: llama-3.3-70b-versatile
    // for tools/text, llama-4-scout for vision. GROQ_MODEL is a legacy alias
    // for the text model.
    GROQ_API_KEY: z.string().trim().optional(),
    GROQ_BASE_URL: z.string().url().optional(),
    GROQ_MODEL: z.string().optional(),
    GROQ_TEXT_MODEL: z.string().optional(),
    GROQ_VISION_MODEL: z.string().optional(),
    // Zhipu GLM (free, OpenAI-compatible). glm-4-flash text / glm-4v-flash vision.
    ZHIPU_API_KEY: z.string().trim().optional(),
    ZHIPU_BASE_URL: z.string().url().optional(),
    ZHIPU_TEXT_MODEL: z.string().optional(),
    ZHIPU_VISION_MODEL: z.string().optional(),
    // Google Gemini (free tier). Used ONLY for vision (best food-photo quality)
    // since 2.5 Flash's free tier is ~20 requests/DAY. A second key doubles that
    // quota: vision uses GEMINI_API_KEY first, then auto-switches to
    // GEMINI_API_KEY_2 when the first hits its daily limit.
    GEMINI_API_KEY: z.string().trim().optional(),
    GEMINI_API_KEY_2: z.string().trim().optional(),
    GEMINI_MODEL: z.string().optional(),
    // NVIDIA NIM (free, OpenAI-compatible) at integrate.api.nvidia.com.
    NVIDIA_API_KEY: z.string().trim().optional(),
    NVIDIA_BASE_URL: z.string().url().optional(),
    NVIDIA_TEXT_MODEL: z.string().optional(),
    NVIDIA_VISION_MODEL: z.string().optional(),
    OPENAI_API_KEY: z.string().trim().optional(),
    ENCRYPTION_KEY: z.string().length(64),
  },
  extends: [vercel(), upstashRedis()],
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
});
