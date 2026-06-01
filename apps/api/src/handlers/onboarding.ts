import { openai } from "@ai-sdk/openai";
import { processOnboardingMessage } from "@caltext/ai";
import {
  createUser,
  deleteOnboardingState,
  getOnboardingState,
  setOnboardingState,
  setReminderRunId,
} from "@caltext/db";
import type { OnboardingState } from "@caltext/shared";
import { CONSENT_VERSION, calculateTDEE, isOnboardingComplete } from "@caltext/shared";
import type { RequestLogger } from "evlog";
import { createAILogger } from "evlog/ai";
import { start } from "workflow/api";
import { reminderLoop } from "../../workflows/reminder-loop";

export async function handleOnboarding(
  log: RequestLogger,
  userId: string,
  text: string,
  encryptedPhone: string,
  locale: string,
  timezone: string,
  country: string,
): Promise<string[]> {
  if (!text.trim()) return [];

  const raw = await getOnboardingState(userId);
  const isFirstMessage = !raw;
  const state: OnboardingState = raw ?? {};

  if (!state.timezone && timezone) {
    state.timezone = timezone;
    state.timezoneConfirmed = true;
  }

  const ai = createAILogger(log);
  const model = ai.wrap(openai("gpt-4.1-mini"));

  log.set({ onboarding: { isFirstMessage, stateFields: Object.keys(state).length } });

  const { extracted, reply } = await processOnboardingMessage(
    text,
    state,
    {
      isFirstMessage,
      timezone,
      locale,
    },
    model,
  );

  log.set({ onboarding: { extractedFields: Object.keys(extracted) } });

  const diff: Partial<OnboardingState> = {};
  if (!raw?.timezone && timezone) diff.timezone = timezone;
  for (const [k, v] of Object.entries(extracted)) {
    if (v !== undefined && v !== null) {
      (diff as Record<string, unknown>)[k] = v;
    }
  }

  diff.lastBotReply = reply;

  await setOnboardingState(userId, diff);

  const merged: OnboardingState = { ...state, ...extracted };

  if (isOnboardingComplete(merged)) {
    const sex = merged.sex ?? "unspecified";
    const target = calculateTDEE(
      sex,
      merged.weightKg!,
      merged.heightCm!,
      merged.age!,
      merged.activity!,
      merged.goal!,
    );

    log.set({ onboarding: { complete: true, dailyTarget: target } });

    const { reply: welcomeReply } = await processOnboardingMessage(
      text,
      merged,
      {
        isFirstMessage: false,
        timezone,
        locale,
        dailyTarget: target,
      },
      model,
    );

    await Promise.all([
      createUser(userId, encryptedPhone, {
        name: merged.name!,
        locale: merged.detectedLocale ?? locale,
        timezone: merged.timezone!,
        country,
        dailyCalorieTarget: target,
        goal: merged.goal!,
        activity: merged.activity!,
        sex,
        age: merged.age!,
        heightCm: merged.heightCm!,
        weightKg: merged.weightKg!,
        onboardingComplete: true,
        consentedAt: new Date().toISOString(),
        consentVersion: CONSENT_VERSION,
      }),
      deleteOnboardingState(userId),
    ]);

    try {
      const run = await start(reminderLoop, [userId]);
      await setReminderRunId(userId, run.runId);
    } catch (err) {
      log.error(err as Error);
    }

    return [welcomeReply];
  }

  return [reply];
}
