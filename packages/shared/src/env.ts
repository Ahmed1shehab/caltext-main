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
    OPENAI_API_KEY: z.string().min(1),
    ENCRYPTION_KEY: z.string().length(64),
  },
  extends: [vercel(), upstashRedis()],
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
});
