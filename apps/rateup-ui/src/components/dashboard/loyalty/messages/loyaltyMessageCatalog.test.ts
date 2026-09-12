import type { TFunction } from "i18next";
import { describe, expect, test } from "vitest";

import { LoyaltyEventType } from "@/backend/loyalty/eventTriggers.api";

import {
  loyaltyEventCatalog,
  loyaltyKeywordCatalog,
  loyaltyMessageCatalog,
  loyaltyStarterValues,
  messageVariables,
  starterByTemplateName,
  templateBodyProblem,
  variableHint,
} from "./loyaltyMessageCatalog";

const t = ((key: string) => key) as unknown as TFunction;

/** Meta's rule, as two patterns: leading and trailing whitespace does not excuse either. */
const OPENS_ON_VARIABLE = /^\s*\{\{\d+\}\}/;
const CLOSES_ON_VARIABLE = /\{\{\d+\}\}\s*$/;

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

  // Meta rejects the submission outright: "Variables can't be at the start or end of the
  // template." Every body here is a ready-to-submit starter, keyword replies included — a
  // customer who has never messaged the business is answered with a template, not text.
  test("no starter body begins or ends with a variable", () => {
    for (const definition of loyaltyMessageCatalog(t)) {
      expect({
        name: definition.templateName,
        opens: OPENS_ON_VARIABLE.test(definition.body),
      }).toEqual({ name: definition.templateName, opens: false });
      expect({
        name: definition.templateName,
        closes: CLOSES_ON_VARIABLE.test(definition.body),
      }).toEqual({ name: definition.templateName, closes: false });
    }
  });

  // The bodies these two patterns were written for, so a pattern that stopped matching
  // anything cannot quietly pass the catalogue.
  test("the patterns catch what Meta refused", () => {
    expect(OPENS_ON_VARIABLE.test("{{1}}, {{2}} points expire on {{3}}. Use them.")).toBe(true);
    expect(CLOSES_ON_VARIABLE.test("Your referral code is {{1}}. Share this link: {{2}}")).toBe(
      true,
    );
  });

  // Meta also requires the numbering to ascend in order of appearance, so a body cannot be
  // made compliant by swapping a trailing slot with an earlier one.
  test("variables appear in ascending order", () => {
    for (const definition of loyaltyMessageCatalog(t)) {
      const order = [...definition.body.matchAll(/\{\{(\d+)\}\}/g)].map((m) => Number(m[1]));
      expect(order).toEqual([...order].sort((a, b) => a - b));
      expect(new Set(order).size).toBe(order.length);
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

describe("loyaltyStarterValues", () => {
  test("opens the editor on a body-only UTILITY loyalty template", () => {
    const starter = loyaltyEventCatalog(t)[0];
    expect(loyaltyStarterValues(starter)).toMatchObject({
      name: starter.templateName,
      body: starter.body,
      example: starter.example,
      category: "UTILITY",
      status: "DRAFT",
      templateType: "LOYALTY",
      buttons: [],
      header: null,
    });
  });

  test("carries no account — the editor picks that, so nothing is written by opening it", () => {
    const values = loyaltyStarterValues(loyaltyEventCatalog(t)[0]);
    expect(values).not.toHaveProperty("whatsappSettingsPhoneId");
  });
});

describe("starterByTemplateName", () => {
  test("finds the message a ?starter= link names", () => {
    const catalog = loyaltyMessageCatalog(t);
    expect(starterByTemplateName(catalog, "loyalty_points_issued")?.templateName).toBe(
      "loyalty_points_issued",
    );
  });

  test("is undefined for a name the catalog has dropped, and for none at all", () => {
    const catalog = loyaltyMessageCatalog(t);
    expect(starterByTemplateName(catalog, "loyalty_retired_message")).toBeUndefined();
    expect(starterByTemplateName(catalog, undefined)).toBeUndefined();
  });
});

describe("templateBodyProblem", () => {
  test("names the rule Meta would refuse on", () => {
    expect(templateBodyProblem("{{1}}, your points expire soon.", t)).toMatch(/starts or ends/);
    expect(templateBodyProblem("Your code is {{1}}. Share: {{2}}", t)).toMatch(/starts or ends/);
    expect(templateBodyProblem("Hi {{2}}, you earned {{1}} points.", t)).toMatch(/in order/);
  });

  test("passes a compliant body, variables and all", () => {
    expect(templateBodyProblem("Hi {{1}}, you earned {{2}} points.", t)).toBeNull();
    expect(templateBodyProblem("Here is what you can redeem.", t)).toBeNull();
  });

  test("every starter in the catalog is accepted", () => {
    for (const definition of loyaltyMessageCatalog(t)) {
      expect(templateBodyProblem(definition.body, t), definition.templateName).toBeNull();
    }
  });
});
