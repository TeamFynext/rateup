import type { TFunction } from "i18next";
import { describe, expect, test } from "vitest";

import { LoyaltyEventType } from "@/backend/loyalty/eventTriggers.api";

import {
  loyaltyDraftPayload,
  loyaltyEventCatalog,
  loyaltyKeywordCatalog,
  loyaltyMessageCatalog,
  messageVariables,
  variableHint,
} from "./loyaltyMessageCatalog";

const t = ((key: string) => key) as unknown as TFunction;

describe("the message catalog", () => {
  test("covers every event type exactly once", () => {
    const events = loyaltyEventCatalog(t).map((d) => d.eventType);
    expect([...events].sort()).toEqual(Object.values(LoyaltyEventType).sort());
  });

  test("template names are unique across events and keywords", () => {
    const names = loyaltyMessageCatalog(t).map((d) => d.templateName);
    expect(new Set(names).size).toBe(names.length);
  });

  // The dispatcher fills {{1}}, {{2}} … positionally; the starter body must not ask for
  // more slots than the event supplies, or Meta gets an empty variable.
  test("every starter body uses only the variables its event supplies", () => {
    for (const definition of loyaltyMessageCatalog(t)) {
      const slots = [...definition.body.matchAll(/\{\{(\d+)\}\}/g)].map((m) => Number(m[1]));
      expect(Math.max(0, ...slots)).toBeLessThanOrEqual(definition.params.length);
      expect(definition.example).toHaveLength(Math.max(0, ...slots));
    }
  });

  test("the customer's name is always the first variable of an event message", () => {
    for (const definition of loyaltyEventCatalog(t)) {
      expect(definition.params[0]).toBe("customer name");
    }
  });

  test("the four preset names match the wizard's", () => {
    const byEvent = new Map(loyaltyEventCatalog(t).map((d) => [d.eventType, d.templateName]));
    expect(byEvent.get(LoyaltyEventType.POINTS_ISSUED)).toBe("loyalty_points_issued");
    expect(byEvent.get(LoyaltyEventType.REWARD_REDEEMED)).toBe("loyalty_reward_redeemed");
    expect(byEvent.get(LoyaltyEventType.TIER_UPGRADED)).toBe("loyalty_tier_upgraded");
    expect(byEvent.get(LoyaltyEventType.BIRTHDAY)).toBe("loyalty_birthday");
  });

  test("the five keywords are the ones the inbound handler answers", () => {
    expect(loyaltyKeywordCatalog(t).map((k) => k.type)).toEqual([
      "CustomerRegistration",
      "PointInformation",
      "Referral",
      "RewardsIssued",
      "CustomerRemoval",
    ]);
  });
});

describe("variables", () => {
  test("turn labels into positional tokens", () => {
    expect(messageVariables(["name", "points"])).toEqual([
      { token: "{{1}}", label: "name" },
      { token: "{{2}}", label: "points" },
    ]);
    expect(variableHint(["name", "points"])).toBe("{{1}} name · {{2}} points");
  });
});

describe("loyaltyDraftPayload", () => {
  test("is a body-only UTILITY draft on the chosen account", () => {
    const starter = loyaltyEventCatalog(t)[0];
    const payload = loyaltyDraftPayload(starter, "phone-1");
    expect(payload).toMatchObject({
      name: starter.templateName,
      body: starter.body,
      example: starter.example,
      category: "UTILITY",
      status: "DRAFT",
      templateType: "LOYALTY",
      whatsappSettingsPhoneId: "phone-1",
    });
  });
});
