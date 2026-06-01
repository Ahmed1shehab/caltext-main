import { describe, expect, mock, test } from "bun:test";

mock.module("@caltext/shared", () => ({
  getLocaleName: (locale: string) => {
    const names: Record<string, string> = { en: "English", sv: "Swedish" };
    return names[locale] ?? "English";
  },
  DEFAULT_WATER_TARGET_ML: 2500,
}));

const { buildDailySummaryPrompt, buildReminderPrompt, buildSystemPrompt, buildWeeklyRecapPrompt } =
  await import("../prompts");

const baseProfile = {
  id: "usr_test123",
  phone: "encrypted",
  name: "Alice",
  locale: "en",
  timezone: "America/New_York",
  country: "US",
  dailyCalorieTarget: 2000,
  goal: "lose" as const,
  activity: "moderate" as const,
  sex: "female" as const,
  age: 28,
  heightCm: 168,
  weightKg: 65,
  onboardingComplete: true,
  consentedAt: "2026-01-01T00:00:00Z",
  consentVersion: "2026-04-08",
  createdAt: "2026-01-01T00:00:00Z",
};

const baseContext = {
  userId: "usr_test123",
  userName: "Alice",
  localeName: "English",
  locale: "en",
  timezone: "America/New_York",
  localDate: "2026-04-08",
  dailyCalorieTarget: 2000,
  userProfile: baseProfile,
  memories: null,
  todayLog: null,
  streak: null,
  todayWater: null,
};

function makeContext(overrides: Record<string, unknown> = {}) {
  return { ...baseContext, ...overrides };
}

describe("buildSystemPrompt", () => {
  test("includes personality and base instructions", () => {
    const prompt = buildSystemPrompt(makeContext());
    expect(prompt).toContain("Caltext");
    expect(prompt).toContain("English");
    expect(prompt).toContain("Chill and minimal");
  });

  test("includes user profile when present", () => {
    const prompt = buildSystemPrompt(makeContext());
    expect(prompt).toContain("User: Alice");
    expect(prompt).toContain("Daily target: 2000 kcal");
    expect(prompt).toContain("Goal: lose");
  });

  test("includes memories when present", () => {
    const prompt = buildSystemPrompt(
      makeContext({ memories: { diet: "vegetarian", allergies: "peanuts" } }),
    );
    expect(prompt).toContain("What I know about them");
    expect(prompt).toContain("diet: vegetarian");
    expect(prompt).toContain("allergies: peanuts");
  });

  test("includes today log when meals logged", () => {
    const prompt = buildSystemPrompt(
      makeContext({
        todayLog: {
          calories: 1200,
          protein: 80,
          carbs: 120,
          fat: 40,
          fiber: 15,
          mealCount: 2,
          meals: [],
        },
      }),
    );
    expect(prompt).toContain("Today so far: 2 meals");
    expect(prompt).toContain("1200 kcal");
  });

  test("includes streak when > 1", () => {
    const prompt = buildSystemPrompt(makeContext({ streak: 7 }));
    expect(prompt).toContain("7 days");
  });

  test("omits streak section when null or <= 1", () => {
    const prompt = buildSystemPrompt(makeContext({ streak: 1 }));
    expect(prompt).not.toContain("Streak:");
    const prompt2 = buildSystemPrompt(makeContext({ streak: null }));
    expect(prompt2).not.toContain("Streak:");
  });

  test("responds in Swedish when locale is sv", () => {
    const prompt = buildSystemPrompt(makeContext({ locale: "sv" }));
    expect(prompt).toContain("Swedish");
  });

  test("includes packaged product label instructions", () => {
    const prompt = buildSystemPrompt(makeContext());
    expect(prompt).toContain("nutritionLabel");
    expect(prompt).toContain("do NOT call lookupNutrition");
  });

  test("includes confirmation step instructions", () => {
    const prompt = buildSystemPrompt(makeContext());
    expect(prompt).toContain("Log it?");
    expect(prompt).toContain("logMeal");
  });

  test("includes water tracking instructions", () => {
    const prompt = buildSystemPrompt(makeContext());
    expect(prompt).toContain("logWater");
    expect(prompt).toContain("2500ml");
  });

  test("includes water status when present", () => {
    const prompt = buildSystemPrompt(makeContext({ todayWater: { totalMl: 750, glasses: 3 } }));
    expect(prompt).toContain("Water today: 750ml");
    expect(prompt).toContain("3 glasses");
  });

  test("includes delete account instructions", () => {
    const prompt = buildSystemPrompt(makeContext());
    expect(prompt).toContain("deleteAccount");
    expect(prompt).toContain("confirmed=false");
  });

  test("includes favorite meal instructions", () => {
    const prompt = buildSystemPrompt(makeContext());
    expect(prompt).toContain("saveFavorite");
    expect(prompt).toContain("logFavorite");
  });

  test("includes profile update instructions", () => {
    const prompt = buildSystemPrompt(makeContext());
    expect(prompt).toContain("updateProfile");
  });

  test("includes weight logging instructions", () => {
    const prompt = buildSystemPrompt(makeContext());
    expect(prompt).toContain("logWeight");
  });

  test("includes data export instructions", () => {
    const prompt = buildSystemPrompt(makeContext());
    expect(prompt).toContain("exportData");
  });
});

describe("buildDailySummaryPrompt", () => {
  test("includes locale name", () => {
    expect(buildDailySummaryPrompt("en")).toContain("English");
    expect(buildDailySummaryPrompt("sv")).toContain("Swedish");
  });

  test("includes fiber and optional closing line rules", () => {
    const p = buildDailySummaryPrompt("en");
    expect(p).toContain("Fiber");
    expect(p.toLowerCase()).toContain("optional");
    expect(p.toLowerCase()).toContain("coaching");
  });
});

describe("buildReminderPrompt", () => {
  test("includes locale name", () => {
    expect(buildReminderPrompt("en")).toContain("English");
  });

  test("describes progress and log CTA", () => {
    const p = buildReminderPrompt("en");
    expect(p.toLowerCase()).toContain("progress");
    expect(p.toLowerCase()).toContain("photo");
  });
});

describe("buildWeeklyRecapPrompt", () => {
  test("includes locale name", () => {
    expect(buildWeeklyRecapPrompt("en")).toContain("English");
  });
});
