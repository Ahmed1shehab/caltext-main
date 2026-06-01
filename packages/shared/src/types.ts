export interface UserProfile {
  id: string; // generated user ID, e.g. "usr_a7x2k9m"
  phone: string; // encrypted phone (for Sendblue reverse lookup)
  name: string;
  locale: string; // BCP-47 language tag, e.g. "sv", "en", "pt-BR"
  timezone: string; // IANA timezone, e.g. "Europe/Stockholm"
  country: string; // ISO 3166-1 code
  dailyCalorieTarget: number;
  goal: "lose" | "maintain" | "gain";
  activity: "sedentary" | "light" | "moderate" | "active" | "very_active";
  sex: "male" | "female" | "unspecified";
  age: number;
  heightCm: number;
  weightKg: number;
  onboardingComplete: boolean;
  consentedAt: string | null;
  consentVersion: string | null;
  createdAt: string; // ISO 8601
}

export interface FoodItem {
  name: string;
  estimatedGrams: number;
  preparationMethod: string;
  confidence: "high" | "medium" | "low";
  notes?: string;
}

export interface NutritionInfo {
  matchedName: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
}

export interface MealItem extends FoodItem {
  nutrition: NutritionInfo;
}

export interface MealEntry {
  id: string;
  userId: string;
  name?: string; // e.g. "Greek plate", "Afternoon snack"
  items: MealItem[];
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  totalFiber: number;
  photoUrl?: string;
  source: "photo" | "text" | "manual";
  timestamp: string; // ISO 8601 UTC
  localDate: string; // YYYY-MM-DD in user's timezone
}

export interface DailyLog {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  mealCount: number;
  meals: MealEntry[];
}

export interface StreakInfo {
  current: number;
  longest: number;
  lastLogDate: string; // YYYY-MM-DD in user's timezone
}

export interface OnboardingState {
  name?: string;
  timezoneConfirmed?: boolean;
  timezone?: string;
  sex?: "male" | "female" | "unspecified";
  age?: number;
  heightCm?: number;
  weightKg?: number;
  goal?: "lose" | "maintain" | "gain";
  activity?: "sedentary" | "light" | "moderate" | "active" | "very_active";
  consented?: boolean;
  detectedLocale?: string;
  lastBotReply?: string;
}

export type OnboardingFieldKey = "name" | "body_stats" | "goal" | "activity" | "consent";

export function getMissingFields(state: OnboardingState): OnboardingFieldKey[] {
  const missing: OnboardingFieldKey[] = [];
  if (!state.name) missing.push("name");
  if (!state.age || !state.heightCm || !state.weightKg) missing.push("body_stats");
  if (!state.goal) missing.push("goal");
  if (!state.activity) missing.push("activity");
  if (missing.length === 0 && !state.consented) missing.push("consent");
  return missing;
}

export function isOnboardingComplete(state: OnboardingState): boolean {
  return getMissingFields(state).length === 0 && state.consented === true;
}

export interface WaterLog {
  totalMl: number;
  glasses: number; // each glass = 250ml
}

export interface WeightEntry {
  weightKg: number;
  date: string; // YYYY-MM-DD
}

export interface AgentContext {
  userId: string;
  userName: string;
  localeName: string; // human-readable language name
  locale: string;
  timezone: string;
  localDate: string; // YYYY-MM-DD in user's timezone
  dailyCalorieTarget: number;
  userProfile: UserProfile | null;
  memories: Record<string, string> | null;
  todayLog: DailyLog | null;
  streak: number | null;
  todayWater: WaterLog | null;
  imageUrl?: string; // if the user sent a photo
}

export interface PhoneRegionInfo {
  locale: string;
  timezone: string;
  country: string;
  countryName: string;
}
