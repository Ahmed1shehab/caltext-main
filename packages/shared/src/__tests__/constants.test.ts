import { describe, expect, test } from "bun:test";
import { calculateBMR, calculateTDEE, MAX_DAILY_CALORIES, MIN_DAILY_CALORIES } from "../constants";

describe("calculateBMR (Mifflin-St Jeor)", () => {
  test("male — 80kg, 180cm, age 30", () => {
    // 10*80 + 6.25*180 - 5*30 + 5 = 800 + 1125 - 150 + 5 = 1780
    expect(calculateBMR("male", 80, 180, 30)).toBe(1780);
  });

  test("female — 65kg, 165cm, age 25", () => {
    // 10*65 + 6.25*165 - 5*25 - 161 = 650 + 1031.25 - 125 - 161 = 1395.25
    expect(calculateBMR("female", 65, 165, 25)).toBe(1395.25);
  });

  test("male — edge case: very low weight", () => {
    // 10*50 + 6.25*160 - 5*20 + 5 = 500 + 1000 - 100 + 5 = 1405
    expect(calculateBMR("male", 50, 160, 20)).toBe(1405);
  });

  test("unspecified — average of male and female constants", () => {
    const male = calculateBMR("male", 80, 180, 30);
    const female = calculateBMR("female", 80, 180, 30);
    const mid = (male + female) / 2;
    expect(calculateBMR("unspecified", 80, 180, 30)).toBe(mid);
  });
});

describe("calculateTDEE", () => {
  test("male, moderate activity, maintain", () => {
    // BMR = 1780, TDEE = 1780 * 1.55 + 0 = 2759
    expect(calculateTDEE("male", 80, 180, 30, "moderate", "maintain")).toBe(
      Math.round(1780 * 1.55),
    );
  });

  test("unspecified TDEE between male and female for same stats", () => {
    const male = calculateTDEE("male", 80, 180, 30, "moderate", "maintain");
    const female = calculateTDEE("female", 80, 180, 30, "moderate", "maintain");
    const unspec = calculateTDEE("unspecified", 80, 180, 30, "moderate", "maintain");
    expect(unspec).toBeGreaterThan(Math.min(male, female));
    expect(unspec).toBeLessThan(Math.max(male, female));
  });

  test("female, sedentary, lose weight — clamped to minimum", () => {
    // BMR = 1395.25, raw = 1395.25 * 1.2 - 500 = 1174, clamped to 1200
    expect(calculateTDEE("female", 65, 165, 25, "sedentary", "lose")).toBe(MIN_DAILY_CALORIES);
  });

  test("male, very active, gain weight", () => {
    // BMR = 1780, TDEE = 1780 * 1.9 + 300 = 3682
    expect(calculateTDEE("male", 80, 180, 30, "very_active", "gain")).toBe(
      Math.round(1780 * 1.9 + 300),
    );
  });

  test("unknown activity/goal falls back to moderate/0", () => {
    // BMR = 1780, TDEE = 1780 * 1.55 = 2759
    expect(calculateTDEE("male", 80, 180, 30, "unknown", "unknown")).toBe(Math.round(1780 * 1.55));
  });

  test("clamps to minimum when result is dangerously low", () => {
    // Near-zero height → tiny BMR → raw TDEE well below 1200
    expect(calculateTDEE("male", 90, 5, 36, "active", "lose")).toBe(MIN_DAILY_CALORIES);
  });

  test("clamps to maximum when result is unreasonably high", () => {
    expect(calculateTDEE("male", 300, 250, 18, "very_active", "gain")).toBe(MAX_DAILY_CALORIES);
  });
});
