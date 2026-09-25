import type { TFunction } from "i18next";
import { describe, expect, test } from "vitest";

import {
  eventLabel,
  NOTIFICATION_EVENTS,
  notificationEvent,
  notificationMessage,
  notificationPath,
} from "./notificationCopy.ts";

// Stands in for i18next-icu: returns the key with `{name}` placeholders filled.
const t = ((key: string, values?: Record<string, string>) =>
  key.replace(/\{(\w+)\}/g, (_, name: string) => values?.[name] ?? "")) as unknown as TFunction;

describe("notification copy", () => {
  test("every catalogue event has a label and a message", () => {
    for (const event of NOTIFICATION_EVENTS) {
      expect(eventLabel(t, event)).toBeTruthy();
      expect(notificationMessage(t, event, {})).toBeTruthy();
    }
  });

  test("fills the message from the row's data", () => {
    expect(notificationMessage(t, "inbox.assigned", { contactName: "Ann" })).toBe(
      "A conversation with Ann was assigned to you.",
    );
  });

  test("reads rows written before the catalogue by their subSource", () => {
    expect(notificationEvent({ event: null, subSource: "chat-assigned" })).toBe("inbox.assigned");
    expect(notificationEvent({ event: null, subSource: "capi-error" })).toBe("integration.error");
    expect(notificationEvent({ event: null, subSource: "something-else" })).toBeNull();
    expect(notificationEvent({ event: "campaign.failed", subSource: "campaign.failed" })).toBe(
      "campaign.failed",
    );
  });

  test("opens the path the server stored, and rebuilds it for older rows", () => {
    expect(notificationPath("campaign.failed", { path: "/dashboard/campaign/c-1" })).toBe(
      "/dashboard/campaign/c-1",
    );
    expect(notificationPath("inbox.closed", { contactId: "c 1" })).toBe(
      "/dashboard/inbox?tab=closed&contactId=c%201",
    );
    for (const path of ["https://evil.example", "//evil.example"]) {
      expect(notificationPath("billing.conversation_limit", { path })).toBe(
        "/dashboard/settings/billing",
      );
    }
  });
});
