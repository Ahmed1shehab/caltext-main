import {
  DAILY_SUMMARY_HOUR,
  isDayOfWeek,
  MEAL_TIMES,
  msUntil,
  nextLocalTime,
  STREAK_MILESTONES,
  WEEKLY_RECAP_DAY,
  WEEKLY_RECAP_HOUR,
} from "@caltext/shared";
import { sleep } from "workflow";
import {
  generateDailySummary,
  generateReminder,
  generateWeeklyRecap,
  loadDailyLog,
  loadReminderTimes,
  loadUser,
  sendMsg,
} from "./steps/reminder-steps";

export async function reminderLoop(userId: string) {
  "use workflow";

  while (true) {
    const user = await loadUser(userId);
    if (!user) break;

    const tz = user.timezone;
    const locale = user.locale;

    const customTimes = await loadReminderTimes(userId);
    const mealTimes = customTimes
      ? customTimes.map((t) => ({
          label: t.label,
          hour: t.hour,
          minute: t.minute,
          emoji: "🍽️",
        }))
      : [...MEAL_TIMES];

    for (const meal of mealTimes) {
      const target = nextLocalTime(meal.hour, meal.minute, tz);
      const waitMs = msUntil(target);
      if (waitMs > 0) {
        await sleep(`${waitMs}ms`);
      }

      const log = await loadDailyLog(userId, tz);

      const alreadyLogged = log.meals.some((m) => {
        const mealHour = new Date(m.timestamp).getHours();
        return Math.abs(mealHour - meal.hour) < 3;
      });

      if (log.mealCount === 0 || !alreadyLogged) {
        const reminder = await generateReminder(
          userId,
          meal.label,
          meal.emoji,
          locale,
          user.name,
          log.calories,
          user.dailyCalorieTarget,
          log.mealCount,
        );
        await sendMsg(userId, reminder);
      }
    }

    const summaryTarget = nextLocalTime(DAILY_SUMMARY_HOUR, 0, tz);
    const summaryWait = msUntil(summaryTarget);
    if (summaryWait > 0) {
      await sleep(`${summaryWait}ms`);
    }

    const summaryResult = await generateDailySummary(userId, locale);
    if (summaryResult) {
      await sendMsg(userId, summaryResult.text);

      const milestoneMsg = STREAK_MILESTONES[summaryResult.streak.current];
      if (milestoneMsg) {
        await sendMsg(userId, milestoneMsg);
      }
    }

    if (isDayOfWeek(tz, WEEKLY_RECAP_DAY)) {
      const recapTarget = nextLocalTime(WEEKLY_RECAP_HOUR, 0, tz);
      const recapWait = msUntil(recapTarget);
      if (recapWait > 0) {
        await sleep(`${recapWait}ms`);
      }

      const recap = await generateWeeklyRecap(userId, locale);
      if (recap) {
        await sendMsg(userId, recap);
      }
    }
  }
}
