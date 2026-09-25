import { describe, expect, test } from "vitest";
import {
  DEFAULT_PREFERENCES,
  deliveredChannels,
  eventToggle,
  mergeOverrides,
  parseOverrides,
  preferencesFromRow,
} from "./notification.preferences.js";

const row = (overrides: unknown, channels: Partial<Record<string, boolean>> = {}) => ({
  inApp: true,
  push: true,
  email: true,
  desktop: true,
  sound: true,
  ...channels,
  overrides,
});

describe("parseOverrides", () => {
  test("keeps only events and channels the catalogue still offers", () => {
    expect(
      parseOverrides({
        "inbox.assigned": { push: false, sms: true },
        "inbox.closed": { email: true },
        "retired.event": { inApp: false },
      }),
    ).toEqual({ "inbox.assigned": { push: false } });
  });

  test("reads garbage as no overrides", () => {
    expect(parseOverrides(null)).toEqual({});
    expect(parseOverrides([])).toEqual({});
    expect(parseOverrides({ "inbox.assigned": { push: "no" } })).toEqual({});
  });
});

describe("eventToggle", () => {
  test("falls back to the catalogue default", () => {
    expect(eventToggle(DEFAULT_PREFERENCES, "inbox.assigned", "push")).toBe(true);
    expect(eventToggle(DEFAULT_PREFERENCES, "inbox.closed", "inApp")).toBe(false);
  });

  test("is undefined for a channel the event does not offer", () => {
    expect(eventToggle(DEFAULT_PREFERENCES, "inbox.closed", "email")).toBeUndefined();
  });

  test("an override wins", () => {
    const prefs = preferencesFromRow(row({ "inbox.closed": { inApp: true } }));
    expect(eventToggle(prefs, "inbox.closed", "inApp")).toBe(true);
  });
});

describe("deliveredChannels", () => {
  test("is the event's defaults for a member who never changed anything", () => {
    expect([...deliveredChannels(preferencesFromRow(null), "campaign.completed")]).toEqual([
      "inApp",
      "email",
    ]);
  });

  test("a master switch turned off silences that channel for every event", () => {
    const prefs = preferencesFromRow(row({}, { push: false }));
    expect(deliveredChannels(prefs, "inbox.assigned").has("push")).toBe(false);
    expect(deliveredChannels(prefs, "inbox.assigned").has("inApp")).toBe(true);
  });

  test("an event toggle cannot switch on a channel whose master switch is off", () => {
    const prefs = preferencesFromRow(row({ "inbox.assigned": { email: true } }, { email: false }));
    expect(deliveredChannels(prefs, "inbox.assigned").has("email")).toBe(false);
  });
});

describe("mergeOverrides", () => {
  test("stores a change from the default", () => {
    expect(mergeOverrides({}, { "inbox.assigned": { push: false } })).toEqual({
      "inbox.assigned": { push: false },
    });
  });

  test("setting a toggle back to its default forgets it", () => {
    expect(
      mergeOverrides({ "inbox.assigned": { push: false } }, { "inbox.assigned": { push: true } }),
    ).toEqual({});
  });

  test("ignores unknown events and channels the event does not offer", () => {
    expect(
      mergeOverrides({}, { "retired.event": { push: false }, "inbox.closed": { email: true } }),
    ).toEqual({});
  });

  test("leaves the other channels of an event alone", () => {
    expect(
      mergeOverrides(
        { "inbox.mentioned": { push: false } },
        { "inbox.mentioned": { email: true } },
      ),
    ).toEqual({ "inbox.mentioned": { push: false, email: true } });
  });
});
