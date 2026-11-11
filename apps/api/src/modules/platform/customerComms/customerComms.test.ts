import { describe, expect, test, vi } from "vite-plus/test";

vi.mock("../../../utils/prisma.js", () => ({ default: {} }));
vi.mock("../../../utils/logger.js", () => ({
  log: { error: vi.fn(), info: vi.fn(), trace: vi.fn(), warn: vi.fn() },
}));
vi.mock("../../../workers/bullmq/queues/customerComms.queue.js", () => ({
  enqueueCustomerMessages: vi.fn(async () => {}),
}));

import { parseBlocks } from "../../../emails/customer-update.js";
import { inSendWindow } from "./audience.js";
import { DRIP_STEPS, fill } from "./drip.catalogue.js";
import { nextDueStep } from "./drip.service.js";
import { dripEmailSchema, effectiveEmail, effectiveWhatsapp } from "./dripContent.js";
import type { ActivationSignals } from "./signals.js";
import { suppressionsFrom } from "./sns.js";
import { signUnsubscribeToken, verifyUnsubscribeToken } from "./unsubscribe.js";
import { toWhatsappNumber } from "./whatsapp.js";

const DAY = 86_400_000;
const now = new Date("2026-10-08T06:00:00Z"); // 11:30 in Kolkata

function signals(ageDays: number, overrides: Partial<ActivationSignals> = {}): ActivationSignals {
  return {
    createdAt: new Date(now.getTime() - ageDays * DAY - 60_000),
    whatsappConnected: false,
    campaignSent: false,
    loyaltyActive: false,
    automationsSet: false,
    teammateInvited: false,
    activeLast7Days: false,
    ...overrides,
  };
}

describe("unsubscribe tokens", () => {
  test("round-trip", () => {
    const token = signUnsubscribeToken("4f1c2a8e-0000-4000-8000-000000000001", "email");
    expect(verifyUnsubscribeToken(token)).toEqual({
      userId: "4f1c2a8e-0000-4000-8000-000000000001",
      channel: "email",
    });
  });

  test("a token for someone else's id fails", () => {
    const [, sig] = signUnsubscribeToken("a", "email").split(".");
    const forged = `${Buffer.from("b:email").toString("base64url")}.${sig}`;
    expect(verifyUnsubscribeToken(forged)).toBeNull();
    expect(verifyUnsubscribeToken("garbage")).toBeNull();
  });
});

describe("nextDueStep", () => {
  const none = new Set<string>();

  test("day 0 is the welcome", () => {
    expect(nextDueStep(signals(0), none, none, now)?.key).toBe("onb_welcome");
  });

  test("a step whose goal is met is skipped", () => {
    const sent = new Set(["onb_welcome"]);
    expect(nextDueStep(signals(1), sent, none, now)?.key).toBe("onb_connect_help");
    expect(nextDueStep(signals(1, { whatsappConnected: true }), sent, none, now)).toBeNull();
  });

  test("an earlier step held back by the cap goes before a later one", () => {
    const sent = new Set(["onb_welcome"]);
    // Day 3: connect-help (day 1) is still inside its grace window.
    expect(nextDueStep(signals(3), sent, none, now)?.key).toBe("onb_connect_help");
  });

  test("a step past its grace window is dropped", () => {
    const sent = new Set(["onb_welcome", "onb_connect_help"]);
    // Day 9: first-broadcast (day 3) is past grace; nothing until automations on day 10.
    expect(
      nextDueStep(
        signals(9, { whatsappConnected: true }),
        sent,
        new Set(["onb_founder_checkin"]),
        now,
      ),
    ).toBeNull();
  });

  test("a disabled step is never chosen", () => {
    expect(nextDueStep(signals(0), none, new Set(["onb_welcome"]), now)).toBeNull();
  });

  test("keys are unique", () => {
    expect(new Set(DRIP_STEPS.map((s) => s.key)).size).toBe(DRIP_STEPS.length);
  });
});

describe("send window", () => {
  test("10:00-19:00 Kolkata", () => {
    expect(inSendWindow(new Date("2026-10-08T06:00:00Z"))).toBe(true); // 11:30
    expect(inSendWindow(new Date("2026-10-08T14:00:00Z"))).toBe(false); // 19:30
    expect(inSendWindow(new Date("2026-10-08T03:00:00Z"))).toBe(false); // 08:30
  });
});

describe("SES events", () => {
  test("permanent bounces and complaints suppress, transient bounces do not", () => {
    expect(
      suppressionsFrom({
        eventType: "Bounce",
        bounce: { bounceType: "Permanent", bouncedRecipients: [{ emailAddress: "A@x.com" }] },
      }),
    ).toEqual([{ email: "a@x.com", reason: "BOUNCE", detail: undefined }]);
    expect(
      suppressionsFrom({
        eventType: "Bounce",
        bounce: { bounceType: "Transient", bouncedRecipients: [{ emailAddress: "a@x.com" }] },
      }),
    ).toEqual([]);
    expect(
      suppressionsFrom({
        notificationType: "Complaint",
        complaint: {
          complainedRecipients: [{ emailAddress: "b@x.com" }],
          complaintFeedbackType: "abuse",
        },
      }),
    ).toEqual([{ email: "b@x.com", reason: "COMPLAINT", detail: "abuse" }]);
  });
});

describe("copy helpers", () => {
  test("fill replaces every placeholder", () => {
    expect(fill("{name} at {org}, {name}", { name: "Priya", org: "Kettle" })).toBe(
      "Priya at Kettle, Priya",
    );
  });

  test("markdown subset blocks", () => {
    expect(parseBlocks("## New\n\nHello\nthere\n\n- one\n- two")).toEqual([
      { kind: "heading", text: "New" },
      { kind: "paragraph", text: "Hello there" },
      { kind: "list", items: ["one", "two"] },
    ]);
  });

  test("phone numbers become Meta digits", () => {
    expect(toWhatsappNumber("98765 43210")).toBe("919876543210");
    expect(toWhatsappNumber("+971 50 123 4567")).toBe("971501234567");
    expect(toWhatsappNumber("hello")).toBeNull();
    expect(toWhatsappNumber(null)).toBeNull();
  });
});

describe("editable drip wording", () => {
  const welcome = DRIP_STEPS[0];

  test("every catalogue email passes the editor's schema", () => {
    for (const step of DRIP_STEPS) expect(dripEmailSchema.safeParse(step.email).success).toBe(true);
  });

  test("unknown placeholders and unsafe links are refused", () => {
    const base = { ...welcome.email };
    expect(dripEmailSchema.safeParse({ ...base, subject: "Hi {first_name}" }).success).toBe(false);
    expect(
      dripEmailSchema.safeParse({ ...base, cta: { label: "Go", path: "javascript:alert(1)" } })
        .success,
    ).toBe(false);
    expect(
      dripEmailSchema.safeParse({ ...base, cta: { label: "Go", path: "//evil.example" } }).success,
    ).toBe(false);
    expect(
      dripEmailSchema.safeParse({ ...base, cta: { label: "Go", path: "https://rateup.app/x" } })
        .success,
    ).toBe(true);
  });

  test("a designed email needs a title; a plain note does not", () => {
    expect(dripEmailSchema.safeParse({ ...welcome.email, title: "" }).success).toBe(false);
    expect(dripEmailSchema.safeParse({ ...welcome.email, title: "", plain: true }).success).toBe(
      true,
    );
  });

  test("saved wording wins; missing or broken falls back to the catalogue", () => {
    const edited = { ...welcome.email, subject: "Hello {name}" };
    expect(effectiveEmail(welcome, edited).subject).toBe("Hello {name}");
    expect(effectiveEmail(welcome, null)).toBe(welcome.email);
    expect(effectiveEmail(welcome, { subject: 42 })).toBe(welcome.email);
  });

  test("WhatsApp: saved template, saved off, or the catalogue's", () => {
    const emailOnly = DRIP_STEPS.find((s) => !s.whatsapp)!;
    expect(effectiveWhatsapp(welcome, null)).toBe(welcome.whatsapp!.template);
    expect(effectiveWhatsapp(welcome, { template: "rateup_welcome_v2" })).toBe("rateup_welcome_v2");
    expect(effectiveWhatsapp(welcome, { template: null })).toBeNull();
    expect(effectiveWhatsapp(emailOnly, null)).toBeNull();
    expect(effectiveWhatsapp(emailOnly, { template: "rateup_tip_v1" })).toBe("rateup_tip_v1");
    expect(effectiveWhatsapp(welcome, { template: 7 })).toBe(welcome.whatsapp!.template);
  });
});
