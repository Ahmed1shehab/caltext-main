import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import type { LanguageModelV3 } from "@ai-sdk/provider";
import { env } from "@caltext/shared";
import { wrapLanguageModel } from "ai";

// Some models (notably Groq's llama-3.3-70b) intermittently emit a malformed
// tool call — e.g. the arguments get jammed into the function name — which the
// provider hard-rejects with a 400 ("tool_use_failed" / "tool call validation
// failed"). That kills the whole turn and surfaces as "Oops" to the user. Since
// the failure is intermittent, simply re-running the same generation almost
// always succeeds, so we wrap the tool-calling (text) model with a middleware
// that retries on exactly that error.
function isMalformedToolCall(err: unknown): boolean {
  const msg = String((err as { message?: unknown })?.message ?? err);
  return /tool_use_failed|tool call validation failed|not in request\.tools/i.test(msg);
}

function withToolCallRetry(model: LanguageModelV3, attempts = 2): LanguageModelV3 {
  return wrapLanguageModel({
    model,
    middleware: {
      specificationVersion: "v3",
      wrapGenerate: async ({ doGenerate }) => {
        let lastErr: unknown;
        for (let i = 0; i <= attempts; i++) {
          try {
            return await doGenerate();
          } catch (err) {
            lastErr = err;
            if (!isMalformedToolCall(err)) throw err;
          }
        }
        throw lastErr;
      },
    },
  });
}

// Every free provider has a wall: Groq caps tokens-per-minute (12k on the free
// tier), OpenRouter caps requests-per-day (~50 free). When one wall is hit the
// provider returns a rate-limit error and the turn dies as "Oops". To stay up,
// we wrap the primary model so that on a rate-limit error it transparently
// re-runs the SAME request against a fallback provider. Combined, the two free
// tiers cover each other: Groq's big daily budget is the workhorse, OpenRouter
// absorbs the rare per-minute spillover (and vice-versa).
function isRateLimited(err: unknown): boolean {
  const msg = String((err as { message?: unknown })?.message ?? err);
  return /rate[\s_-]?limit|free-models-per-day|too many requests|\b429\b|tokens per minute|\bTPM\b|quota|resource[\s_-]?exhausted/i.test(
    msg,
  );
}

function withRateLimitFallback(
  primary: LanguageModelV3,
  fallback: LanguageModelV3 | null,
): LanguageModelV3 {
  if (!fallback) return primary;
  return wrapLanguageModel({
    model: primary,
    middleware: {
      specificationVersion: "v3",
      wrapGenerate: async ({ doGenerate, params }) => {
        try {
          return await doGenerate();
        } catch (err) {
          if (!isRateLimited(err)) throw err;
          // Primary provider is throttled — retry the identical request on the
          // fallback provider. doGenerate already exhausted the SDK's backoff.
          return await fallback.doGenerate(params);
        }
      },
    },
  });
}

// Reasoning models (e.g. OpenRouter's openai/gpt-oss, qwen) return their chain
// of thought as a `reasoning` content part. When the cross-provider fallback
// mixes such a model into a loop, that part is serialized as `reasoning_content`
// on the NEXT request, and providers like Groq hard-reject it (400 "property
// 'reasoning_content' is unsupported"), killing the turn. Strip reasoning parts
// from the prompt before EVERY call so no provider chokes on another's chain of
// thought — historical reasoning isn't needed to generate the next step.
function base(model: LanguageModelV3): LanguageModelV3 {
  return wrapLanguageModel({
    model,
    middleware: {
      specificationVersion: "v3",
      transformParams: async ({ params }) => {
        const prompt = params.prompt.map((m) =>
          m.role === "assistant" && Array.isArray(m.content)
            ? { ...m, content: m.content.filter((p) => p.type !== "reasoning") }
            : m,
        );
        return { ...params, prompt };
      },
    },
  });
}

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
      // Split models: llama-3.3-70b-versatile is Groq's most reliable tool
      // caller (the agent loop + structured output), while llama-4-scout is
      // multimodal for reading photos. Llama-4-scout's tool calling is flaky on
      // complex schemas (Groq rejects malformed calls with `tool_use_failed`),
      // so it is NOT used for the text/tool path. GROQ_MODEL stays as a legacy
      // override for the text model.
      return {
        text: groq(env.GROQ_TEXT_MODEL ?? env.GROQ_MODEL ?? "llama-3.3-70b-versatile"),
        vision: groq(env.GROQ_VISION_MODEL ?? "meta-llama/llama-4-scout-17b-16e-instruct"),
      };
    }
    case "gemini": {
      if (!env.GEMINI_API_KEY) {
        throw new Error("AI_PROVIDER=gemini but GEMINI_API_KEY is not set");
      }
      const google = createGoogleGenerativeAI({ apiKey: env.GEMINI_API_KEY });
      // Gemini Flash is multimodal: one model handles text, tool calling, and
      // vision. NOTE: for this project's account (Egypt region) gemini-2.0-flash
      // is provisioned at limit:0, but gemini-2.5-flash has a small free tier
      // (~20 requests/DAY). That daily cap is far too small to run the whole
      // agent on, so Gemini is used ONLY as the vision model (1 call per photo);
      // text/tools stay on Groq. 2.5 Flash is a thinking model — callers disable
      // thinking (thinkingBudget:0) to protect the output budget and quota.
      const model = google(env.GEMINI_MODEL ?? "gemini-2.5-flash");
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

// Does this provider have an API key configured? Used to pick a viable fallback.
function hasKey(name: ProviderName): boolean {
  switch (name) {
    case "openrouter":
      return !!env.OPENROUTER_API_KEY;
    case "groq":
      return !!env.GROQ_API_KEY;
    case "gemini":
      return !!env.GEMINI_API_KEY;
    case "nvidia":
      return !!env.NVIDIA_API_KEY;
    case "zhipu":
      return !!env.ZHIPU_API_KEY;
  }
}

// When the primary provider is rate-limited, fall over to the first of these
// (other than the primary) whose key is set. Order = preferred fallbacks.
const FALLBACK_ORDER: ProviderName[] = ["groq", "openrouter", "gemini", "nvidia", "zhipu"];

function buildFallbackModels(primary: ProviderName): Models | null {
  for (const name of FALLBACK_ORDER) {
    if (name === primary || !hasKey(name)) continue;
    try {
      return buildModels(name);
    } catch {
      // Misconfigured fallback — skip it rather than break the primary path.
    }
  }
  return null;
}

// Folds an ordered list of models into a rate-limit fallback chain: the first is
// primary, each subsequent one catches the previous's rate-limit error.
function chainFallback(models: LanguageModelV3[]): LanguageModelV3 {
  let chain = models[models.length - 1]!;
  for (let i = models.length - 2; i >= 0; i--) chain = withRateLimitFallback(models[i]!, chain);
  return chain;
}

// Vision is decoupled from the text provider. Gemini 2.5 Flash has by far the
// best food-photo quality but only ~20 requests/DAY free, so it leads the chain
// (1 call per photo) and Groq's llama-4-scout / OpenRouter absorb the overflow
// once Gemini's daily quota is spent. Every model is reasoning-stripped via base().
const VISION_ORDER: ProviderName[] = ["gemini", "groq", "openrouter", "nvidia", "zhipu"];

// Gemini 2.5 Flash is vision-only here (~20 req/DAY free). Multiple keys multiply
// that quota: build one vision model per configured key so the fallback chain
// switches to the next key when one hits its daily limit (a rate-limit error
// `isRateLimited` matches), before finally falling through to Groq/OpenRouter.
function geminiVisionModels(): LanguageModelV3[] {
  const keys = [env.GEMINI_API_KEY, env.GEMINI_API_KEY_2].filter(
    (k): k is string => !!k,
  );
  return keys.map((apiKey) =>
    base(createGoogleGenerativeAI({ apiKey })(env.GEMINI_MODEL ?? "gemini-2.5-flash")),
  );
}

function buildVisionModelList(primaryVision: LanguageModelV3): LanguageModelV3[] {
  const built: LanguageModelV3[] = [];
  for (const name of VISION_ORDER) {
    if (name === "gemini") {
      // Expands to one model per Gemini key (or nothing if no key is set).
      built.push(...geminiVisionModels());
      continue;
    }
    if (!hasKey(name)) continue;
    try {
      built.push(base(buildModels(name).vision));
    } catch {
      // Misconfigured provider — skip rather than break the vision chain.
    }
  }
  return built.length > 0 ? built : [base(primaryVision)];
}

export const PROVIDER = resolveProviderName();
const primaryModels = buildModels(PROVIDER);
const fallbackModels = buildFallbackModels(PROVIDER);

// Wrap every underlying model with the reasoning-stripping base so that, even
// when the fallback mixes providers mid-loop, no provider receives another's
// reasoning_content. Only the text model does tool calling, so only it needs the
// malformed-tool-call retry. Both paths get cross-provider rate-limit fallback.
const textModel = withToolCallRetry(
  withRateLimitFallback(base(primaryModels.text), fallbackModels ? base(fallbackModels.text) : null),
);

// The ordered vision models (gemini key1, gemini key2, groq scout, openrouter…).
// Exposed as a LIST — not just a folded rate-limit chain — because the vision
// call does STRUCTURED output, which can fail to parse (AI_NoObjectGeneratedError)
// without any rate-limit error. identifyFood walks this list so a parse failure
// (not only a quota hit) falls through to the next model.
const visionModelList = buildVisionModelList(primaryModels.vision);
export function visionModels(): LanguageModelV3[] {
  return visionModelList;
}
const visionModel = chainFallback(visionModelList);

export function chatModel(hasImage = false): LanguageModelV3 {
  return hasImage ? visionModel : textModel;
}
