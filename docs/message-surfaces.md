# Message surfaces and voice

Caltext uses two intentional **voices**. Keeping this split avoids blurring logging UX with retention UX.

## Transactional (interactive chat)

**Where:** `buildSystemPrompt` in `packages/ai/src/prompts.ts` (main agent).

**Goal:** Fast scanning, consistent parsing, minimal tokens. User is actively logging or asking for status.

**Rules:** Strict blocks for food identification, post-log confirmation, and daily status. Emojis as **data labels** (food per line, macro line with P / C / F). No diet coaching, no filler.

## Proactive (scheduled / setup)

**Where:**

| Surface | Code |
|--------|------|
| Onboarding | `packages/ai/src/onboarding.ts` |
| Meal reminders | `buildReminderPrompt` |
| Daily summary (~21:00) | `buildDailySummaryPrompt` + `generateDailySummary` in `apps/api/workflows/steps/reminder-steps.ts` |
| Weekly recap | `buildWeeklyRecapPrompt` + `generateWeeklyRecap` |

**Goal:** Nudges and wrap-ups — clarity on what to do next, end-of-day closure. Warmer than chat where it helps (reminders); data-dense for summaries and weekly (verbatim bars must not be rewritten by the model).

**Emoji note:** Meal-time emojis (breakfast / lunch / dinner) in reminders are **not** the same role as macro emojis (P / C / F / fiber) in summaries and chat. Both are intentional.

## Changing prompts

When editing any surface, check whether it is **transactional** or **proactive** and preserve that family’s constraints. Do not make the main agent chatty to match reminders, or strip structure from logging flows to match summaries.
