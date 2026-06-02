import type { LanguageModelV3 } from "@ai-sdk/provider";
import type { OnboardingState } from "@caltext/shared";
import { z } from "zod";
import { chatModel } from "./model";
import { ciEnum, generateStructured } from "./structured";

const defaultModel = chatModel();

const extractionSchema = z.object({
  name: z.string().nullable().describe("User's first name. Null if not mentioned."),
  sex: ciEnum(["male", "female", "unspecified"])
    .nullable()
    .describe(
      "male/female for Mifflin-St Jeor; unspecified if user skips, prefers not to say, or declines. Null if not mentioned.",
    ),
  age: z.number().nullable().describe("Age in years. Null if not mentioned."),
  heightCm: z
    .number()
    .nullable()
    .describe("Height converted to cm. 5'6\"=167.6, 6ft=182.9, 1in=2.54cm. Null if not mentioned."),
  weightKg: z
    .number()
    .nullable()
    .describe("Weight converted to kg. 1lb=0.4536kg, 1stone=6.35kg. Null if not mentioned."),
  goal: ciEnum(["lose", "maintain", "gain"])
    .nullable()
    .describe("Fitness goal. Null if not mentioned."),
  activity: ciEnum(["sedentary", "light", "moderate", "active", "very_active"])
    .nullable()
    .describe("Activity level. Null if not mentioned."),
  consented: z
    .boolean()
    .nullable()
    .describe("True if user agreed to store health data, false if refused, null if not addressed."),
  detectedLocale: z
    .string()
    .nullable()
    .describe(
      "BCP-47 language code of the user's message, e.g. 'sv', 'en', 'fr', 'de'. Null only if truly ambiguous.",
    ),
  reply: z.string().describe("Your reply message to the user."),
});

function describeState(state: OnboardingState): string {
  const parts: string[] = [];
  if (state.name) parts.push(`name: ${state.name}`);
  if (state.sex) parts.push(`sex: ${state.sex}`);
  if (state.age) parts.push(`age: ${state.age}`);
  if (state.heightCm) parts.push(`height: ${state.heightCm}cm`);
  if (state.weightKg) parts.push(`weight: ${state.weightKg}kg`);
  if (state.goal) parts.push(`goal: ${state.goal}`);
  if (state.activity) parts.push(`activity: ${state.activity}`);
  if (state.consented) parts.push("consent: given");
  return parts.length > 0 ? parts.join(", ") : "nothing yet";
}

function describeMissing(state: OnboardingState): string {
  const missing: string[] = [];
  if (!state.name) missing.push("name");
  if (!state.age) missing.push("age");
  if (!state.heightCm) missing.push("height");
  if (!state.weightKg) missing.push("weight");
  if (!state.goal) missing.push("goal (lose/maintain/gain)");
  if (!state.activity) missing.push("activity level (sedentary/light/moderate/active/very active)");
  if (!state.consented) missing.push("consent to store health data");
  return missing.join(", ");
}

export interface OnboardingContext {
  isFirstMessage: boolean;
  timezone: string;
  locale: string;
  dailyTarget?: number;
}

export interface OnboardingResult {
  extracted: Partial<OnboardingState>;
  reply: string;
}

export async function processOnboardingMessage(
  text: string,
  state: OnboardingState,
  ctx: OnboardingContext,
  model?: LanguageModelV3,
): Promise<OnboardingResult> {
  const replyLang = state.detectedLocale
    ? `Reply in ${state.detectedLocale} (the user's language).`
    : "Reply in the same language the user writes in. Detect their language from the message.";

  const conversationContext = state.lastBotReply
    ? `\nYOUR PREVIOUS MESSAGE TO THE USER: "${state.lastBotReply}"\n(The user is responding to this message. Interpret their reply in this context.)\n`
    : "";

  let situation: string;

  if (ctx.isFirstMessage) {
    situation = `This is the user's FIRST message. Welcome them as Leo, a calorie tracking buddy in iMessage.

CONTENT (keep SHORT — about one phone screen, ~3-6 short sentences OR two bubbles max):
- Lead with the payoff: they'll get a **personal daily calorie target** in about **~2 minutes**.
- Ask for: **name**, **goal** (lose/maintain/gain), **height, weight, age** (any units; **rough estimates are fine**), **activity** (sedentary → very active).
- **Sex is optional** for the standard formula: **male**, **female**, or say **skip** / prefer not to say → we use a **neutral estimate** (middle of the usual male/female range). Do NOT require sex.
- After setup: they **text or photo** meals. Mention briefly: **meal-time nudges** in their timezone, **evening daily summary**, **weekly recap**. Optionally use 2-4 lines with **one emoji per line** for those perks (e.g. meal nudges, summary, recap) OR one prose sentence — not both styles at once.
- Storage: we **save** what they share so targets and logs work; they can **delete anytime**.
- End with a clear CTA: they can send **everything in one message or a few messages** — you'll ask for gaps.

TONE: friendly, iMessage-native, not a bulleted essay.`;
  } else if (ctx.dailyTarget) {
    situation = `The user is fully set up! Their daily calorie target is ${ctx.dailyTarget} kcal. Reply with ONLY:
"✅ All set! Your daily target is ${ctx.dailyTarget} kcal.
Snap or text your next meal to start logging. You'll get light meal reminders and an evening summary."
No extra commentary or enthusiasm.`;
  } else {
    situation = `This is a follow-up message. The user already provided some info.
Already collected: ${describeState(state)}.
Still missing: ${describeMissing(state)}.

In your reply: briefly acknowledge any new info they just provided, then ask only for what is still missing — **one or two asks at a time** if several fields are missing (do not dump the full checklist again). If only consent is missing, warmly ask for their OK to store health data (mention they can delete anytime). Keep it short and conversational.`;
  }

  let output: z.infer<typeof extractionSchema> | null = null;
  try {
    output = await generateStructured({
      model: model ?? defaultModel,
      schema: extractionSchema,
      prompt: `You are Leo, a friendly calorie tracking assistant in iMessage. ${replyLang}
${conversationContext}
USER MESSAGE: "${text}"

CURRENT STATE: ${describeState(state)}

SITUATION: ${situation}

EXTRACTION INSTRUCTIONS:
- Extract values the user stated or confirmed in this message. Use null for anything not addressed.
- CRITICAL: If your previous message asked the user to confirm something (e.g. consent) and the user replies affirmatively (yes, yeah, yep, ja, japp, oui, si, ok, sure, etc.), mark it as true.
- sex: use "unspecified" if they skip, decline, prefer not to say, or say neutral — NOT null if they clearly declined sex.
- For height: convert to cm (5'6" = 167.6cm, 6ft = 182.9cm)
- For weight: convert to kg (1lb = 0.4536kg)
- consented: true if they agreed to data storage (including a general "yes" when consent was asked about), null only if consent was never mentioned
- detectedLocale: detect the BCP-47 language code from the user's message text

REPLY INSTRUCTIONS:
- Write a short, casual iMessage-style reply (1-3 emoji max unless using the optional one-emoji-per-line micro-list for perks in the first message only)
- Do NOT repeat or echo back what the user just told you. Just move on to what's next.
- Never repeat a greeting if the user already introduced themselves
- Be direct like a friend texting, not formal
- Do NOT wrap the reply in quotes
- NEVER re-ask for information the user already confirmed`,
    });
  } catch {
    output = null;
  }

  if (!output) {
    return { extracted: {}, reply: "Hey! Something went wrong -- try again? 🙏" };
  }

  const extracted: Partial<OnboardingState> = {};
  if (output.name) extracted.name = output.name;
  if (output.sex) extracted.sex = output.sex;
  if (output.age !== null && output.age !== undefined && output.age >= 5 && output.age <= 130)
    extracted.age = output.age;
  if (
    output.heightCm !== null &&
    output.heightCm !== undefined &&
    output.heightCm >= 50 &&
    output.heightCm <= 300
  )
    extracted.heightCm = Math.round(output.heightCm * 10) / 10;
  if (
    output.weightKg !== null &&
    output.weightKg !== undefined &&
    output.weightKg >= 15 &&
    output.weightKg <= 500
  )
    extracted.weightKg = Math.round(output.weightKg * 10) / 10;
  if (output.goal) extracted.goal = output.goal;
  if (output.activity) extracted.activity = output.activity;
  if (output.consented === true) extracted.consented = true;
  if (output.detectedLocale && !state.detectedLocale) {
    extracted.detectedLocale = output.detectedLocale;
  }

  return { extracted, reply: output.reply };
}
