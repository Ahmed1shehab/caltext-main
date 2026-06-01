import { getCountry } from "countries-and-timezones";
import { parsePhoneNumber } from "libphonenumber-js";
import type { PhoneRegionInfo } from "./types";

const COUNTRY_LOCALE: Record<string, string> = {
  US: "en",
  CA: "en",
  GB: "en",
  AU: "en",
  NZ: "en",
  IE: "en",
  SE: "sv",
  NO: "nb",
  DK: "da",
  FI: "fi",
  DE: "de",
  AT: "de",
  CH: "de",
  FR: "fr",
  BE: "fr",
  ES: "es",
  MX: "es",
  AR: "es",
  CO: "es",
  PT: "pt",
  BR: "pt-BR",
  IT: "it",
  NL: "nl",
  PL: "pl",
  CZ: "cs",
  JP: "ja",
  KR: "ko",
  CN: "zh",
  TW: "zh-TW",
  IN: "hi",
  IL: "he",
  TR: "tr",
  RU: "ru",
  UA: "uk",
  SA: "ar",
  EG: "ar",
  AE: "ar",
  TH: "th",
  VN: "vi",
  ID: "id",
};

export const LOCALE_NAMES: Record<string, string> = {
  en: "English",
  sv: "Swedish",
  nb: "Norwegian",
  da: "Danish",
  fi: "Finnish",
  de: "German",
  fr: "French",
  es: "Spanish",
  "pt-BR": "Brazilian Portuguese",
  pt: "Portuguese",
  it: "Italian",
  nl: "Dutch",
  pl: "Polish",
  cs: "Czech",
  ja: "Japanese",
  ko: "Korean",
  zh: "Chinese",
  "zh-TW": "Traditional Chinese",
  hi: "Hindi",
  he: "Hebrew",
  tr: "Turkish",
  ru: "Russian",
  uk: "Ukrainian",
  ar: "Arabic",
  th: "Thai",
  vi: "Vietnamese",
  id: "Indonesian",
};

export function detectRegion(phone: string): PhoneRegionInfo {
  try {
    const parsed = parsePhoneNumber(phone);
    const countryCode = parsed?.country ?? "US";
    const country = getCountry(countryCode);
    const timezones = country?.timezones ?? ["UTC"];
    return {
      locale: COUNTRY_LOCALE[countryCode] ?? "en",
      timezone: timezones[0] ?? "UTC",
      country: countryCode,
      countryName: country?.name ?? "Unknown",
    };
  } catch {
    return { locale: "en", timezone: "UTC", country: "US", countryName: "United States" };
  }
}

export function getLocaleName(locale: string): string {
  return LOCALE_NAMES[locale] ?? "English";
}

export function getTimezoneCity(timezone: string): string {
  // "Europe/Stockholm" -> "Stockholm", "America/New_York" -> "New York"
  const city = timezone.split("/").pop() ?? timezone;
  return city.replace(/_/g, " ");
}
