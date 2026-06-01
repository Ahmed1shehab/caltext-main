import { getUser, updateUser } from "@caltext/db";
import { calculateTDEE } from "@caltext/shared";
import { tool } from "ai";
import { z } from "zod";

export const updateProfileTool = tool({
  description:
    "Update the user's profile settings: calorie target, goal, activity level, weight, height, age, name, or timezone. Recalculates TDEE if body stats or goal change.",
  inputSchema: z.object({
    userId: z.string(),
    dailyCalorieTarget: z.number().optional().describe("New daily calorie target in kcal"),
    goal: z.enum(["lose", "maintain", "gain"]).optional(),
    activity: z.enum(["sedentary", "light", "moderate", "active", "very_active"]).optional(),
    weightKg: z.number().optional(),
    heightCm: z.number().optional(),
    age: z.number().optional(),
    name: z.string().optional(),
    timezone: z.string().optional(),
  }),
  execute: async ({
    userId,
    dailyCalorieTarget,
    goal,
    activity,
    weightKg,
    heightCm,
    age,
    name,
    timezone,
  }) => {
    const user = await getUser(userId);
    if (!user) return { updated: false, message: "User not found." };

    const fields: Record<string, string> = {};
    const changes: string[] = [];

    if (name) {
      fields.name = name;
      changes.push(`name: ${name}`);
    }
    if (timezone) {
      fields.timezone = timezone;
      changes.push(`timezone: ${timezone}`);
    }
    if (goal) {
      fields.goal = goal;
      changes.push(`goal: ${goal}`);
    }
    if (activity) {
      fields.activity = activity;
      changes.push(`activity: ${activity}`);
    }
    if (weightKg) {
      fields.weightKg = String(weightKg);
      changes.push(`weight: ${weightKg}kg`);
    }
    if (heightCm) {
      fields.heightCm = String(heightCm);
      changes.push(`height: ${heightCm}cm`);
    }
    if (age) {
      fields.age = String(age);
      changes.push(`age: ${age}`);
    }

    const shouldRecalculate =
      (weightKg || heightCm || age || goal || activity) && !dailyCalorieTarget;
    if (shouldRecalculate) {
      const newTarget = calculateTDEE(
        user.sex,
        weightKg ?? user.weightKg,
        heightCm ?? user.heightCm,
        age ?? user.age,
        activity ?? user.activity,
        goal ?? user.goal,
      );
      fields.dailyCalorieTarget = String(newTarget);
      changes.push(`recalculated target: ${newTarget} kcal`);
    } else if (dailyCalorieTarget) {
      fields.dailyCalorieTarget = String(dailyCalorieTarget);
      changes.push(`target: ${dailyCalorieTarget} kcal`);
    }

    if (Object.keys(fields).length === 0) {
      return { updated: false, message: "No changes provided." };
    }

    await updateUser(userId, fields);
    return { updated: true, changes };
  },
});
