import type { LanguageModelV3 } from "@ai-sdk/provider";
import { generateObject, type ModelMessage } from "ai";
import { z } from "zod";

// Zhipu GLM (like many OpenAI-compatible providers) rejects the `json_schema`
// response format, so the AI SDK falls back to plain `json_object` mode and
// drops the schema — leaving the model free to invent its own keys, nesting,
// and types. We restore the contract by describing the schema in the system
// prompt, which makes json_object mode produce a correctly-shaped object.
function schemaInstruction(schema: z.ZodType): string {
  const jsonSchema = JSON.stringify(z.toJSONSchema(schema));
  return `You MUST respond with a single JSON object that exactly matches this JSON Schema. Use the exact keys and types shown, output numbers as numbers (never strings), use the exact lowercase enum values, and include every required key — even nullable ones, where you must output null explicitly. Add no extra keys and do not wrap the object in another object.

JSON Schema:
${jsonSchema}`;
}

interface StructuredBase<T> {
  model: LanguageModelV3;
  schema: z.ZodType<T>;
  system?: string;
  maxRetries?: number;
  // Hard cap on output length. Weak models can degenerate into endless
  // repetition (e.g. the same food line over and over); capping tokens bounds
  // the damage and forces the call to return.
  maxOutputTokens?: number;
  // Provider-specific options, namespaced by provider (e.g. `{ google: {...} }`).
  // Providers ignore namespaces that aren't theirs, so it's safe to pass options
  // for a provider that may or may not be the active one (used to disable Gemini
  // 2.5 Flash's "thinking" so the full output budget goes to the structured JSON).
  providerOptions?: Parameters<typeof generateObject>[0]["providerOptions"];
}

type StructuredArgs<T> = StructuredBase<T> &
  ({ prompt: string } | { messages: ModelMessage[] });

/**
 * Schema-validated generation that works on providers without json_schema
 * support. The schema is injected into the system prompt and the result is
 * validated against `schema` (with one automatic retry by default).
 */
export async function generateStructured<T>(args: StructuredArgs<T>): Promise<T> {
  const instruction = schemaInstruction(args.schema);
  const system = args.system ? `${args.system}\n\n${instruction}` : instruction;
  const base = {
    model: args.model,
    schema: args.schema,
    system,
    maxRetries: args.maxRetries ?? 2,
    ...(args.maxOutputTokens ? { maxOutputTokens: args.maxOutputTokens } : {}),
    ...(args.providerOptions ? { providerOptions: args.providerOptions } : {}),
  };

  const { object } =
    "messages" in args
      ? await generateObject({ ...base, messages: args.messages })
      : await generateObject({ ...base, prompt: args.prompt });

  return object;
}

/**
 * Tries each model in order, returning the first that produces a valid object.
 * Unlike the model-level rate-limit fallback (which only catches quota errors at
 * the provider layer), this catches ANY failure — including
 * AI_NoObjectGeneratedError when a model's structured output can't be parsed —
 * and falls through to the next model. Reports which model index succeeded so the
 * caller can log it. Throws the last error if every model fails.
 */
export async function generateStructuredAcross<T>(
  models: LanguageModelV3[],
  args: Omit<StructuredBase<T>, "model"> & ({ prompt: string } | { messages: ModelMessage[] }),
  onSuccess?: (modelIndex: number) => void,
): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < models.length; i++) {
    try {
      const result = await generateStructured({ ...args, model: models[i]! } as StructuredArgs<T>);
      onSuccess?.(i);
      return result;
    } catch (err) {
      lastErr = err;
      // Try the next model on any error (parse failure, quota, transient).
    }
  }
  throw lastErr;
}

/**
 * Case-insensitive enum. GLM in json_object mode often returns enum values with
 * the wrong casing (e.g. "High" instead of "high"); this lowercases the model's
 * output before validating so it still matches.
 */
export function ciEnum<const T extends readonly [string, ...string[]]>(values: T) {
  return z.preprocess(
    (v) => (typeof v === "string" ? v.toLowerCase().trim() : v),
    z.enum(values),
  );
}
