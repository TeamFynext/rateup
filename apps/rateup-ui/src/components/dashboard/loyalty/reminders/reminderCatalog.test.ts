import { describe, expect, test } from "vitest";

import { LoyaltyEventType } from "@/backend/loyalty/eventTriggers.api";

import { DEFAULT_SEND_HOUR, reminderCatalog, sendHourOptions } from "./reminderCatalog.ts";

/** The identity `t` the catalog is given in tests; the real one returns the key too. */
const t = ((key: string) => key) as unknown as Parameters<typeof reminderCatalog>[0];

describe("sendHourOptions", () => {
  // Every option read "00" once, because `t("{hour}:00", …)` put a colon in the key and
  // i18next reads a colon as its namespace separator — so the lookup became key "00" in a
  // namespace called "{hour}". A clock face is digits; it does not go through `t()`.
  test("twenty-four distinct hours, zero-padded", () => {
    const options = sendHourOptions();
    expect(options).toHaveLength(24);
    expect(options[0]).toEqual({ value: "0", label: "00:00" });
    expect(options[9]).toEqual({ value: "9", label: "09:00" });
    expect(options[13]).toEqual({ value: "13", label: "13:00" });
    expect(options[23]).toEqual({ value: "23", label: "23:00" });
  });

  test("no two options read the same", () => {
    const labels = sendHourOptions().map((option) => option.label);
    expect(new Set(labels).size).toBe(24);
  });

  test("the value is what the API stores, so it round-trips as a number", () => {
    for (const option of sendHourOptions()) {
      expect(Number.isInteger(Number(option.value))).toBe(true);
    }
  });

  test("the default send hour is one of the options", () => {
    expect(sendHourOptions().some((o) => o.value === String(DEFAULT_SEND_HOUR))).toBe(true);
  });
});

describe("reminderCatalog", () => {
  test("seven occasions, each with a timing and a hint", () => {
    const occasions = reminderCatalog(t);
    expect(occasions).toHaveLength(7);
    for (const occasion of occasions) {
      expect(occasion.label).toBeTruthy();
      expect(occasion.timingHint).toBeTruthy();
      expect(["leadDays", "quietDays", "onTheDay"]).toContain(occasion.timing);
    }
  });

  test("an occasion with a number input has a label and a starting value for it", () => {
    for (const occasion of reminderCatalog(t)) {
      if (occasion.timing === "onTheDay") continue;
      expect(occasion.daysLabel).toBeTruthy();
      expect(occasion.defaultDays).toBeGreaterThan(0);
    }
  });

  // Nothing here interpolates: the repo passes single braces to an i18next configured for
  // double, so `t("Needs {thing}", …)` renders the placeholder verbatim.
  test("no copy relies on interpolation or contains a colon", () => {
    for (const occasion of reminderCatalog(t)) {
      for (const copy of [
        occasion.label,
        occasion.timingHint,
        occasion.daysLabel,
        occasion.requires,
      ]) {
        if (!copy) continue;
        expect(copy).not.toMatch(/\{/);
        expect(copy).not.toMatch(/:/);
      }
    }
  });

  test("a tier upgrade is not on this page — it has no schedule to set", () => {
    const types = reminderCatalog(t).map((occasion) => occasion.eventType);
    expect(types).not.toContain(LoyaltyEventType.TIER_UPGRADED);
    expect(types).not.toContain(LoyaltyEventType.POINTS_ISSUED);
    expect(types).toContain(LoyaltyEventType.BIRTHDAY);
    expect(types).toContain(LoyaltyEventType.TIER_AT_RISK);
  });
});
