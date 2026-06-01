import { describe, expect, test } from "bun:test";
import { detectRegion, getLocaleName, getTimezoneCity } from "../locale";

describe("detectRegion", () => {
  test("US phone number", () => {
    const result = detectRegion("+14155551234");
    expect(result.locale).toBe("en");
    expect(result.country).toBe("US");
    expect(result.countryName).toContain("United States");
    expect(result.timezone).toBeDefined();
  });

  test("Swedish phone number", () => {
    const result = detectRegion("+46701234567");
    expect(result.locale).toBe("sv");
    expect(result.country).toBe("SE");
    expect(result.timezone).toBeDefined();
  });

  test("Japanese phone number", () => {
    const result = detectRegion("+81312345678");
    expect(result.locale).toBe("ja");
    expect(result.country).toBe("JP");
  });

  test("invalid phone falls back to US/English", () => {
    const result = detectRegion("not-a-phone");
    expect(result.locale).toBe("en");
    expect(result.country).toBe("US");
  });
});

describe("getLocaleName", () => {
  test("known locales", () => {
    expect(getLocaleName("en")).toBe("English");
    expect(getLocaleName("sv")).toBe("Swedish");
    expect(getLocaleName("ja")).toBe("Japanese");
  });

  test("unknown locale falls back to English", () => {
    expect(getLocaleName("xx")).toBe("English");
  });
});

describe("getTimezoneCity", () => {
  test("extracts city from IANA timezone", () => {
    expect(getTimezoneCity("Europe/Stockholm")).toBe("Stockholm");
    expect(getTimezoneCity("America/New_York")).toBe("New York");
  });

  test("handles single segment", () => {
    expect(getTimezoneCity("UTC")).toBe("UTC");
  });
});
