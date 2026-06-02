import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import type { LanguageModelV3 } from "@ai-sdk/provider";
import { env } from "@caltext/shared";

// The whole app routes every model call through chatModel(hasImage). Swap the
// underlying provider with the AI_PROVIDER env var (or just set one provider's
// API key and it auto-selects). Each provider exposes a text model (used for the
// agent loop + tool calls) and a vision model (used to read food photos).
//
//   AI_PROVIDER=openrouter  OPENROUTER_API_KEY=...  (free, email signup, vision)
//   AI_PROVIDER=groq        GROQ_API_KEY=...        (free, email signup, fast vision)
//   AI_PROVIDER=gemini      GEMINI_API_KEY=...      (best vision; free tier blocked in some regions)
//   AI_PROVIDER=nvidia      NVIDIA_API_KEY=...      (free NIM; needs phone verify in some regions)
//   AI_PROVIDER=zhipu       ZHIPU_API_KEY=...       (free GLM, weakest vision)

type ProviderName = "openrouter" | "groq" | "gemini" | "nvidia" | "zhipu";

interface Models {
  text: LanguageModelV3;
  vision: LanguageModelV3;
}

// Free-model hosts on OpenRouter frequently return 429 ("rate-limited upstream").
// We inject OpenRouter's `models` fallback array (capped at 3 entries) so a
// throttled model transparently fails over to the next. Text and vision need
// SEPARATE chains: not every free model accepts images, and not every one does
// tool calling — these lists hold models verified for each mode.
const OPENROUTER_TEXT_FALLBACKS = [
  "meta-llama/llama-3.3-70b-instruct:free",
  "openai/gpt-oss-120b:free",
];
const OPENROUTER_VISION_FALLBACKS = [
  "nvidia/nemotron-nano-12b-v2-vl:free",
  "google/gemma-4-26b-a4b-it:free",
];

// Builds a fetch wrapper that appends the given fallback models to each
// chat-completions request body.
function makeOpenrouterFetch(fallbacks: string[]) {
  return (
    input: Parameters<typeof fetch>[0],
    init?: Parameters<typeof fetch>[1],
  ): Promise<Response> => {
    if (init?.body && typeof init.body === "string") {
      try {
        const body = JSON.parse(init.body);
        if (body && typeof body === "object" && body.model && !body.models) {
          const primary = body.model as string;
          const fb = fallbacks.filter((m) => m !== primary);
          body.models = [primary, ...fb].slice(0, 3);
          init = { ...init, body: JSON.stringify(body) };
        }
      } catch {
        // Body isn't JSON we recognize — forward unchanged.
      }
    }
    return fetch(input, init);
  };
}

function resolveProviderName(): ProviderName {
  if (env.AI_PROVIDER) return env.AI_PROVIDER;
  if (env.OPENROUTER_API_KEY) return "openrouter";
  if (env.GROQ_API_KEY) return "groq";
  if (env.NVIDIA_API_KEY) return "nvidia";
  if (env.GEMINI_API_KEY) return "gemini";
  return "zhipu";
}

function buildModels(name: ProviderName): Models {
  switch (name) {
    case "openrouter": {
      if (!env.OPENROUTER_API_KEY) {
        throw new Error("AI_PROVIDER=openrouter but OPENROUTER_API_KEY is not set");
      }
      // OpenRouter aggregates many free models behind one OpenAI-compatible API.
      // Free model ids carry a ":free" suffix and occasionally change — override
      // with OPENROUTER_TEXT_MODEL / OPENROUTER_VISION_MODEL if one is retired or
      // its upstream host is rate-limited. Kimi K2.6 is multimodal and proved
      // reliable on tools + structured output + food-photo vision, so it serves
      // both roles by default.
      //
      // Free model hosts frequently return 429 ("rate-limited upstream"). We
      // inject OpenRouter's `models` fallback array into every request via a
      // custom fetch, so a throttled model transparently fails over to the next.
      // Every model below is multimodal AND tool-capable, so the same chain
      // serves text/tool calls and vision calls alike.
      const baseURL = env.OPENROUTER_BASE_URL ?? "https://openrouter.ai/api/v1";
      // Cast: our wrapper omits the non-standard `preconnect` member of Bun's
      // fetch type, which the SDK option signature still requires.
      const textProvider = createOpenAICompatible({
        name: "openrouter",
        apiKey: env.OPENROUTER_API_KEY,
        baseURL,
        fetch: makeOpenrouterFetch(OPENROUTER_TEXT_FALLBACKS) as unknown as typeof fetch,
      });
      const visionProvider = createOpenAICompatible({
        name: "openrouter",
        apiKey: env.OPENROUTER_API_KEY,
        baseURL,
        fetch: makeOpenrouterFetch(OPENROUTER_VISION_FALLBACKS) as unknown as typeof fetch,
      });
      const model = env.OPENROUTER_TEXT_MODEL ?? "moonshotai/kimi-k2.6:free";
      const visionModel = env.OPENROUTER_VISION_MODEL ?? "moonshotai/kimi-k2.6:free";
      return { text: textProvider(model), vision: visionProvider(visionModel) };
    }
    case "groq": {
      if (!env.GROQ_API_KEY) {
        throw new Error("AI_PROVIDER=groq but GROQ_API_KEY is not set");
      }
      const groq = createOpenAICompatible({
        name: "groq",
        apiKey: env.GROQ_API_KEY,
        baseURL: env.GROQ_BASE_URL ?? "https://api.groq.com/openai/v1",
      });
      // Llama 4 Scout is multimodal: one model handles text, tools, and vision.
      const model = groq(env.GROQ_MODEL ?? "meta-llama/llama-4-scout-17b-16e-instruct");
      return { text: model, vision: model };
    }
    case "gemini": {
      if (!env.GEMINI_API_KEY) {
        throw new Error("AI_PROVIDER=gemini but GEMINI_API_KEY is not set");
      }
      const google = createGoogleGenerativeAI({ apiKey: env.GEMINI_API_KEY });
      // Gemini Flash is multimodal: one model handles text, tool calling, and
      // vision. gemini-2.0-flash has the most generous free tier (~15 RPM).
      const model = google(env.GEMINI_MODEL ?? "gemini-2.0-flash");
      return { text: model, vision: model };
    }
    case "nvidia": {
      if (!env.NVIDIA_API_KEY) {
        throw new Error("AI_PROVIDER=nvidia but NVIDIA_API_KEY is not set");
      }
      const nvidia = createOpenAICompatible({
        name: "nvidia",
        apiKey: env.NVIDIA_API_KEY,
        baseURL: env.NVIDIA_BASE_URL ?? "https://integrate.api.nvidia.com/v1",
      });
      return {
        text: nvidia(env.NVIDIA_TEXT_MODEL ?? "meta/llama-3.3-70b-instruct"),
        vision: nvidia(env.NVIDIA_VISION_MODEL ?? "meta/llama-3.2-90b-vision-instruct"),
      };
    }
    default: {
      if (!env.ZHIPU_API_KEY) {
        throw new Error("AI_PROVIDER=zhipu but ZHIPU_API_KEY is not set");
      }
      // Zhipu GLM exposes an OpenAI-compatible API. Default endpoint is the
      // mainland host; set ZHIPU_BASE_URL=https://api.z.ai/api/paas/v4 for the
      // international z.ai host.
      const zhipu = createOpenAICompatible({
        name: "zhipu",
        apiKey: env.ZHIPU_API_KEY,
        baseURL: env.ZHIPU_BASE_URL ?? "https://open.bigmodel.cn/api/paas/v4",
      });
      return {
        text: zhipu(env.ZHIPU_TEXT_MODEL ?? "glm-4-flash"),
        vision: zhipu(env.ZHIPU_VISION_MODEL ?? "glm-4v-flash"),
      };
    }
  }
}

export const PROVIDER = resolveProviderName();
const models = buildModels(PROVIDER);

export function chatModel(hasImage = false): LanguageModelV3 {
  return hasImage ? models.vision : models.text;
}
