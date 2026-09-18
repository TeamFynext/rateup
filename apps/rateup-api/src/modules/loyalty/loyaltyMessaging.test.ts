import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../utils/prisma.js", () => ({
  default: {
    contact: { findUnique: vi.fn() },
    whatsappSettings: { findFirst: vi.fn() },
    waMessage: { findFirst: vi.fn() },
    waTemplate: { findUnique: vi.fn() },
    loyaltyProgram: { findUnique: vi.fn() },
  },
}));
vi.mock("../../utils/logger.js", () => ({
  log: { error: vi.fn(), info: vi.fn(), trace: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));
vi.mock("../contact/contact.utils.js", () => ({ handleSendTemplate: vi.fn() }));
vi.mock("../whatsapp/whatsappSurvey/wasurvey.service.js", () => ({ sendMessage: vi.fn() }));
vi.mock("../whatsapp/whatsappSurvey/wasurvey.utils.js", () => ({
  createTextMessage: vi.fn((to: string, _title: null, body: string) => ({ to, body })),
}));
vi.mock("../../../generated/prisma/client.js", () => ({
  PlatformType: { WHATSAPP: "WHATSAPP" },
}));

import prisma from "../../utils/prisma.js";
import { handleSendTemplate } from "../contact/contact.utils.js";
import { sendMessage } from "../whatsapp/whatsappSurvey/wasurvey.service.js";
import {
  isCustomerSessionOpen,
  isTextDowngradable,
  programPrefersTextInSession,
  renderTemplateAsText,
  renderTemplateBody,
  sendLoyaltyMessage,
  SESSION_WINDOW_MINUTES,
} from "./loyaltyMessaging.js";

type Mock = ReturnType<typeof vi.fn>;

const db = prisma as unknown as {
  contact: Record<string, Mock>;
  whatsappSettings: Record<string, Mock>;
  waMessage: Record<string, Mock>;
  waTemplate: Record<string, Mock>;
  loyaltyProgram: Record<string, Mock>;
};

const ORG = "11111111-1111-4111-8111-111111111111";
const PHONE = "919000000001";

const minutesAgo = (minutes: number) => new Date(Date.now() - minutes * 60_000);

const BODY = { type: "BODY", text: "Hi {{1}}, you earned {{2}} points." };
const FOOTER = { type: "FOOTER", text: "Powered by rateup.app" };
const TEXT_HEADER = { type: "HEADER", format: "TEXT", text: "Kettle & Co" };
const IMAGE_HEADER = { type: "HEADER", format: "IMAGE" };
const BUTTONS = { type: "BUTTONS", buttons: [{ type: "URL", text: "Open" }] };

function template(over: Record<string, unknown> = {}) {
  return {
    whatsappSettingsPhoneId: "phone-1",
    data: { status: "APPROVED", components: [BODY], ...over },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  db.contact.findUnique.mockResolvedValue(null);
  db.whatsappSettings.findFirst.mockResolvedValue(null);
  db.waMessage.findFirst.mockResolvedValue(null);
  db.waTemplate.findUnique.mockResolvedValue(null);
  db.loyaltyProgram.findUnique.mockResolvedValue(null);
  (sendMessage as Mock).mockResolvedValue({ status: true, message: "wamid.1" });
  (handleSendTemplate as Mock).mockResolvedValue({ status: true, message: "wamid.2" });
});

// ===========================================================================
// Rendering
// ===========================================================================

describe("renderTemplateBody", () => {
  test("fills the placeholders in order and blanks a missing one", () => {
    expect(renderTemplateBody([BODY], ["Ann"])).toBe("Hi Ann, you earned  points.");
  });

  test("is null without a body", () => {
    expect(renderTemplateBody([FOOTER], ["Ann"])).toBeNull();
    expect(renderTemplateBody(undefined, ["Ann"])).toBeNull();
  });
});

describe("renderTemplateAsText", () => {
  test("puts a text header on its own bold line and drops the footer", () => {
    expect(renderTemplateAsText([TEXT_HEADER, BODY, FOOTER], ["Ann", "43"])).toBe(
      "*Kettle & Co*\n\nHi Ann, you earned 43 points.",
    );
  });

  test("is just the body when there is no header", () => {
    expect(renderTemplateAsText([BODY, FOOTER], ["Ann", "43"])).toBe(
      "Hi Ann, you earned 43 points.",
    );
  });
});

describe("isTextDowngradable", () => {
  test("a body, a text header and a footer lose nothing as text", () => {
    expect(isTextDowngradable([BODY])).toBe(true);
    expect(isTextDowngradable([TEXT_HEADER, BODY, FOOTER])).toBe(true);
  });

  test("buttons and media headers have no text equivalent", () => {
    expect(isTextDowngradable([BODY, BUTTONS])).toBe(false);
    expect(isTextDowngradable([IMAGE_HEADER, BODY])).toBe(false);
  });

  test("nothing without a body", () => {
    expect(isTextDowngradable([FOOTER])).toBe(false);
    expect(isTextDowngradable(null)).toBe(false);
  });
});

// ===========================================================================
// The 24-hour window
// ===========================================================================

describe("isCustomerSessionOpen", () => {
  test("a customer we have never heard from has no window", async () => {
    expect(await isCustomerSessionOpen({ orgId: ORG, phone: PHONE })).toBe(false);

    db.contact.findUnique.mockResolvedValue({ id: "c1", lastReceivedMessageTimeStamp: null });
    expect(await isCustomerSessionOpen({ orgId: ORG, phone: PHONE })).toBe(false);
  });

  test("looks the contact up by the digits, however the phone was written", async () => {
    await isCustomerSessionOpen({ orgId: ORG, phone: `+${PHONE}` });

    expect(db.contact.findUnique.mock.calls[0][0].where).toEqual({
      contact_phone_org_id_unique: { phone: PHONE, orgId: ORG },
    });
  });

  test("a message an hour ago opens the window; one just under 24 h ago closes it", async () => {
    db.contact.findUnique.mockResolvedValue({
      id: "c1",
      lastReceivedMessageTimeStamp: minutesAgo(60),
    });
    expect(await isCustomerSessionOpen({ orgId: ORG, phone: PHONE })).toBe(true);

    db.contact.findUnique.mockResolvedValue({
      id: "c1",
      lastReceivedMessageTimeStamp: minutesAgo(SESSION_WINDOW_MINUTES + 1),
    });
    expect(await isCustomerSessionOpen({ orgId: ORG, phone: PHONE })).toBe(false);
  });

  test("with a sending number, the window is the one on that number", async () => {
    db.contact.findUnique.mockResolvedValue({
      id: "c1",
      lastReceivedMessageTimeStamp: minutesAgo(5),
    });
    db.whatsappSettings.findFirst.mockResolvedValue({ phone: "918000000000" });

    // They wrote to another number recently, never to this one.
    db.waMessage.findFirst.mockResolvedValue(null);
    expect(
      await isCustomerSessionOpen({ orgId: ORG, phone: PHONE, whatsappSettingsPhoneId: "p1" }),
    ).toBe(false);

    db.waMessage.findFirst.mockResolvedValue({ waCreatedAt: minutesAgo(30), createdAt: null });
    expect(
      await isCustomerSessionOpen({ orgId: ORG, phone: PHONE, whatsappSettingsPhoneId: "p1" }),
    ).toBe(true);

    expect(db.waMessage.findFirst.mock.calls[0][0].where).toMatchObject({
      contactId: "c1",
      sourceIdentifier: "918000000000",
      messageBody: { path: ["exchangeProcess"], equals: "receive" },
    });
  });
});

describe("programPrefersTextInSession", () => {
  test("reads the program's switch, defaulting to on", async () => {
    expect(await programPrefersTextInSession(ORG)).toBe(true);
    db.loyaltyProgram.findUnique.mockResolvedValue({ sendTextInSession: false });
    expect(await programPrefersTextInSession(ORG)).toBe(false);
  });
});

// ===========================================================================
// Choosing text or template
// ===========================================================================

describe("sendLoyaltyMessage", () => {
  const openWindow = () =>
    db.contact.findUnique.mockResolvedValue({
      id: "c1",
      lastReceivedMessageTimeStamp: minutesAgo(10),
    });

  test("inside an open window the body goes out as text, from the template's number", async () => {
    db.waTemplate.findUnique.mockResolvedValue(template({ status: "PENDING" }));
    openWindow();

    const result = await sendLoyaltyMessage({
      orgId: ORG,
      phone: PHONE,
      waTemplateId: "tmpl-1",
      params: ["Ann", "43"],
      preferTextInSession: true,
    });

    expect(handleSendTemplate).not.toHaveBeenCalled();
    const call = (sendMessage as Mock).mock.calls[0];
    expect(call[0]).toBe(ORG);
    expect(call[1]).toEqual({ to: PHONE, body: "Hi Ann, you earned 43 points." });
    expect(call[4]).toBe("phone-1");
    expect(call[8]).toBe("AUTOMATED");
    expect(result).toEqual({
      sent: true,
      mode: "text",
      templateId: "tmpl-1",
      text: "Hi Ann, you earned 43 points.",
      skippedReason: null,
    });
  });

  test("a template with buttons is never downgraded", async () => {
    db.waTemplate.findUnique.mockResolvedValue(template({ components: [BODY, BUTTONS] }));
    openWindow();

    const result = await sendLoyaltyMessage({
      orgId: ORG,
      phone: PHONE,
      waTemplateId: "tmpl-1",
      params: ["Ann", "43"],
      preferTextInSession: true,
    });

    expect(sendMessage).not.toHaveBeenCalled();
    expect(handleSendTemplate).toHaveBeenCalledWith("tmpl-1", ORG, PHONE, ["Ann", "43"], undefined);
    expect(result).toMatchObject({ sent: true, mode: "template" });
  });

  test("with the switch off it is always the template", async () => {
    db.waTemplate.findUnique.mockResolvedValue(template());
    openWindow();

    await sendLoyaltyMessage({
      orgId: ORG,
      phone: PHONE,
      waTemplateId: "tmpl-1",
      params: ["Ann", "43"],
      preferTextInSession: false,
    });

    expect(sendMessage).not.toHaveBeenCalled();
    expect(handleSendTemplate).toHaveBeenCalledTimes(1);
  });

  test("outside the window an approved template is sent, with the words it carries", async () => {
    db.waTemplate.findUnique.mockResolvedValue(template());

    const result = await sendLoyaltyMessage({
      orgId: ORG,
      phone: PHONE,
      waTemplateId: "tmpl-1",
      params: ["Ann", "43"],
      preferTextInSession: true,
    });

    expect(handleSendTemplate).toHaveBeenCalledWith("tmpl-1", ORG, PHONE, ["Ann", "43"], undefined);
    expect(result).toEqual({
      sent: true,
      mode: "template",
      templateId: "tmpl-1",
      text: "Hi Ann, you earned 43 points.",
      skippedReason: null,
    });
  });

  test("outside the window a template Meta has not approved is not sent", async () => {
    db.waTemplate.findUnique.mockResolvedValue(template({ status: "PENDING" }));

    const result = await sendLoyaltyMessage({
      orgId: ORG,
      phone: PHONE,
      waTemplateId: "tmpl-1",
      params: ["Ann", "43"],
      preferTextInSession: true,
    });

    expect(handleSendTemplate).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      sent: false,
      mode: null,
      skippedReason: "template_not_approved",
    });
  });

  test("a refused send is reported as such, whichever way it went", async () => {
    db.waTemplate.findUnique.mockResolvedValue(template());
    (handleSendTemplate as Mock).mockResolvedValue({ status: false, message: "no channel" });

    const byTemplate = await sendLoyaltyMessage({
      orgId: ORG,
      phone: PHONE,
      waTemplateId: "tmpl-1",
      params: [],
      preferTextInSession: true,
    });
    expect(byTemplate).toMatchObject({
      sent: false,
      mode: "template",
      skippedReason: "send_failed",
    });

    openWindow();
    (sendMessage as Mock).mockResolvedValue({ status: false, message: "no channel" });
    const byText = await sendLoyaltyMessage({
      orgId: ORG,
      phone: PHONE,
      waTemplateId: "tmpl-1",
      params: [],
      preferTextInSession: true,
    });
    expect(byText).toMatchObject({ sent: false, mode: "text", skippedReason: "send_failed" });
  });

  test("a keyword reply with no template still reaches an open window as text", async () => {
    openWindow();

    const result = await sendLoyaltyMessage({
      orgId: ORG,
      phone: PHONE,
      waTemplateId: null,
      params: [],
      textFallback: "Welcome, Ann!",
      preferTextInSession: true,
    });

    expect((sendMessage as Mock).mock.calls[0][1]).toEqual({ to: PHONE, body: "Welcome, Ann!" });
    expect(result).toMatchObject({ sent: true, mode: "text", templateId: null });
  });

  test("with no template and no window there is nothing that can be sent", async () => {
    const result = await sendLoyaltyMessage({
      orgId: ORG,
      phone: PHONE,
      waTemplateId: null,
      params: [],
      textFallback: "Welcome, Ann!",
      preferTextInSession: true,
    });

    expect(sendMessage).not.toHaveBeenCalled();
    expect(result).toMatchObject({ sent: false, mode: null, skippedReason: "no_template" });
  });
});
