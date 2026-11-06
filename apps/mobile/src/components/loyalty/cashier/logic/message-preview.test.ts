import { describe, expect, test } from "vitest";

import { LoyaltyEventType, type EventTrigger } from "@/api/loyalty/loyalty.type";

import type { Receipt } from "./cashier.types";
import { buildWhatsAppPreview, templateParams } from "./message-preview";

const receipt = (over: Partial<Receipt> = {}): Receipt => ({
  kind: "earned",
  customer: {
    id: "a",
    contactId: "c",
    name: "Anjali Rao",
    phone: "919000000001",
    tierName: "Silver",
  },
  before: 1240,
  delta: 43,
  after: 1283,
  tierBefore: "Silver",
  tierAfter: "Silver",
  nextTierName: "Gold",
  amountToNext: 1180,
  event: LoyaltyEventType.POINTS_ISSUED,
  notification: null,
  ...over,
});

const template = (id: string, status: string, text: string) => ({
  id,
  data: { status, components: [{ type: "BODY", text }] },
});

const trigger = (eventType: LoyaltyEventType, waTemplateId: string, enabled = true) =>
  ({ id: `t-${eventType}`, eventType, enabled, waTemplateId }) as unknown as EventTrigger;

const program = {
  status: "active",
  whatsappNotifications: true,
  pointsActivityAlerts: true,
  pointsName: "Beans",
};

describe("templateParams", () => {
  test("follow the dispatcher's order for each event", () => {
    expect(templateParams(receipt())).toEqual(["Anjali", "43", "1283"]);
    expect(
      templateParams(
        receipt({
          event: LoyaltyEventType.REWARD_REDEEMED,
          rewardName: "Free coffee",
          code: "KC-1",
          delta: -500,
        }),
      ),
    ).toEqual(["Anjali", "Free coffee", "KC-1", "500"]);
    expect(
      templateParams(receipt({ event: LoyaltyEventType.TIER_UPGRADED, tierAfter: "Gold" })),
    ).toEqual(["Anjali", "Gold"]);
  });
});

describe("buildWhatsAppPreview", () => {
  const base = {
    triggers: [trigger(LoyaltyEventType.POINTS_ISSUED, "tpl-1")],
    templates: [
      template(
        "tpl-1",
        "APPROVED",
        "Hi {{1}}, you just earned {{2}} Beans. Your balance is now {{3}}.",
      ),
    ],
    waConnected: true,
    program,
  };

  test("the server's own outcome wins when it is there", () => {
    const sent = buildWhatsAppPreview({
      ...base,
      receipt: receipt({
        notification: {
          sent: true,
          channel: "whatsapp",
          mode: "template",
          templateId: "x",
          text: "Hi Anjali, 43 Beans.",
          skippedReason: null,
        },
      }),
    });
    expect(sent).toEqual({ status: "sent", body: "Hi Anjali, 43 Beans.", mode: "template" });

    const failed = buildWhatsAppPreview({
      ...base,
      receipt: receipt({
        notification: {
          sent: false,
          channel: "whatsapp",
          mode: "template",
          templateId: "x",
          text: "Hi",
          skippedReason: "send_failed",
        },
      }),
    });
    expect(failed.status).toBe("send_failed");
  });

  test("says how a sent message went out, and when Meta has not approved the template", () => {
    const asText = buildWhatsAppPreview({
      ...base,
      receipt: receipt({
        notification: {
          sent: true,
          channel: "whatsapp",
          mode: "text",
          templateId: "x",
          text: "Hi Anjali",
          skippedReason: null,
        },
      }),
    });
    expect(asText).toEqual({ status: "sent", body: "Hi Anjali", mode: "text" });

    const pending = buildWhatsAppPreview({
      ...base,
      receipt: receipt({
        notification: {
          sent: false,
          channel: "whatsapp",
          mode: null,
          templateId: "x",
          text: "Hi Anjali",
          skippedReason: "template_not_approved",
        },
      }),
    });
    expect(pending).toEqual({ status: "template_not_approved", body: "Hi Anjali" });
  });

  test("renders the approved template with the receipt's numbers", () => {
    expect(buildWhatsAppPreview({ ...base, receipt: receipt() })).toEqual({
      status: "sent",
      body: "Hi Anjali, you just earned 43 Beans. Your balance is now 1283.",
    });
  });

  test("says why nothing went out, keeping the words that would have", () => {
    expect(buildWhatsAppPreview({ ...base, waConnected: false, receipt: receipt() }).status).toBe(
      "not_connected",
    );
    expect(
      buildWhatsAppPreview({
        ...base,
        program: { ...program, status: "paused" },
        receipt: receipt(),
      }).status,
    ).toBe("program_inactive");
    expect(
      buildWhatsAppPreview({
        ...base,
        program: { ...program, pointsActivityAlerts: false },
        receipt: receipt(),
      }).status,
    ).toBe("notifications_off");
    expect(buildWhatsAppPreview({ ...base, triggers: [], receipt: receipt() })).toEqual({
      status: "no_trigger",
      body: null,
    });
    expect(
      buildWhatsAppPreview({
        ...base,
        templates: [template("tpl-1", "PENDING", "Hi {{1}}")],
        receipt: receipt(),
      }),
    ).toEqual({ status: "template_not_approved", body: "Hi Anjali" });
  });

  test("a receipt with no event has nothing to preview", () => {
    expect(buildWhatsAppPreview({ ...base, receipt: receipt({ event: null }) })).toEqual({
      status: "no_event",
      body: null,
    });
  });
});
