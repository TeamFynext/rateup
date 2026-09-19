import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../../../../utils/prisma.js", () => ({
  default: { waTemplate: { findUnique: vi.fn() } },
}));
vi.mock("../../../../../utils/logger.js", () => ({
  log: { error: vi.fn(), info: vi.fn(), trace: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));
vi.mock("../../../../whatsapp/meta/metaMessage.service.js", () => ({ sendMetaMessage: vi.fn() }));
vi.mock("../../../../whatsapp/messageTemplates/wa_templates.controller.js", () => ({
  sendTemplateToUserCore: vi.fn(),
}));
vi.mock("../../../../whatsapp/flows/flow.service.js", () => ({ sendFlow: vi.fn() }));
vi.mock("./session.js", () => ({ findOpenSession: vi.fn() }));

import prisma from "../../../../../utils/prisma.js";
import { sendFlow } from "../../../../whatsapp/flows/flow.service.js";
import { sendMetaMessage } from "../../../../whatsapp/meta/metaMessage.service.js";
import { sendTemplateToUserCore } from "../../../../whatsapp/messageTemplates/wa_templates.controller.js";
import type { AcceptedPlan, ChannelSendContext, LoyaltyMessage } from "../../types.js";
import { whatsappChannel } from "./adapter.js";
import { findOpenSession } from "./session.js";

type Mock = ReturnType<typeof vi.fn>;
const db = prisma as unknown as { waTemplate: Record<string, Mock> };

const ORG = "11111111-1111-4111-8111-111111111111";
const PHONE = "919000000001";
const BODY = { type: "BODY", text: "Hi {{1}}, you earned {{2}} points." };
const BUTTONS = { type: "BUTTONS", buttons: [{ type: "QUICK_REPLY", text: "Join" }] };

function ctx(over: Partial<ChannelSendContext> = {}): ChannelSendContext {
  return {
    orgId: ORG,
    program: { sendTextInSession: true },
    recipient: {
      orgId: ORG,
      contactId: "c1",
      accountId: "a1",
      name: "Ann",
      phone: PHONE,
      email: null,
      preferredChannel: null,
    },
    ...over,
  };
}

function storedTemplate(status = "APPROVED", components: unknown[] = [BODY]) {
  return { whatsappSettingsPhoneId: "phone-1", data: { status, components } };
}

const withTemplate: LoyaltyMessage = {
  key: "event:POINTS_ISSUED",
  text: "Hi Ann, 43 points (stored words).",
  artefacts: { WHATSAPP: { waTemplateId: "tmpl-1", params: ["Ann", "43"] } },
};
const wordsOnly: LoyaltyMessage = { key: "event:POINTS_ISSUED", text: "Hi Ann, 43 points." };

async function planAndSend(context: ChannelSendContext, message: LoyaltyMessage) {
  const plan = await whatsappChannel.plan(context, message);
  const result = plan.ok
    ? await whatsappChannel.send(context, message, plan as AcceptedPlan)
    : null;
  return { plan, result };
}

beforeEach(() => {
  vi.clearAllMocks();
  db.waTemplate.findUnique.mockResolvedValue(null);
  (findOpenSession as Mock).mockResolvedValue(null);
  (sendMetaMessage as Mock).mockResolvedValue({ ok: true, messageId: "wamid.1" });
  (sendTemplateToUserCore as Mock).mockResolvedValue({ status: true, message: "ok" });
  (sendFlow as Mock).mockResolvedValue(true);
});

describe("whatsappChannel.plan — a notification", () => {
  test("inside an open window a template's words go as text, from the template's number", async () => {
    db.waTemplate.findUnique.mockResolvedValue(storedTemplate("PENDING"));
    (findOpenSession as Mock).mockResolvedValue({ phoneId: "phone-9" });

    const { plan } = await planAndSend(ctx(), withTemplate);

    expect(plan).toMatchObject({
      ok: true,
      mode: "text",
      text: "Hi Ann, you earned 43 points.",
      templateId: "tmpl-1",
    });
    expect(findOpenSession).toHaveBeenCalledWith({ orgId: ORG, phone: PHONE, phoneId: "phone-1" });
    const sent = (sendMetaMessage as Mock).mock.calls[0][0];
    expect(sent).toMatchObject({
      platform: "WHATSAPP",
      to: PHONE,
      sourceIdentifier: "phone-1",
      messageType: "AUTOMATED",
      isAutomated: true,
    });
    expect(sent.payload).toMatchObject({
      type: "text",
      text: { body: "Hi Ann, you earned 43 points." },
    });
    expect(sendTemplateToUserCore).not.toHaveBeenCalled();
  });

  test("a template with buttons is never downgraded", async () => {
    db.waTemplate.findUnique.mockResolvedValue(storedTemplate("APPROVED", [BODY, BUTTONS]));
    (findOpenSession as Mock).mockResolvedValue({ phoneId: null });

    const { plan } = await planAndSend(ctx(), withTemplate);

    expect(plan).toMatchObject({ ok: true, mode: "template" });
    expect(sendMetaMessage).not.toHaveBeenCalled();
  });

  test("with the programme's switch off it is always the template", async () => {
    db.waTemplate.findUnique.mockResolvedValue(storedTemplate());
    (findOpenSession as Mock).mockResolvedValue({ phoneId: null });

    const { plan } = await planAndSend(
      ctx({ program: { sendTextInSession: false } }),
      withTemplate,
    );

    expect(plan).toMatchObject({ ok: true, mode: "template" });
    expect(findOpenSession).not.toHaveBeenCalled();
  });

  test("outside the window an approved template goes, its parameters as strings", async () => {
    db.waTemplate.findUnique.mockResolvedValue(storedTemplate());

    const { plan, result } = await planAndSend(ctx(), withTemplate);

    expect(plan).toMatchObject({
      ok: true,
      mode: "template",
      text: "Hi Ann, you earned 43 points.",
    });
    expect(result).toMatchObject({ ok: true });
    const call = (sendTemplateToUserCore as Mock).mock.calls[0];
    expect(call.slice(0, 3)).toEqual([ORG, "tmpl-1", PHONE]);
    expect(call[3]).toEqual([
      {
        type: "body",
        parameters: [
          { type: "text", text: "Ann" },
          { type: "text", text: "43" },
        ],
      },
    ]);
  });

  test("outside the window a template Meta has not approved is not sent", async () => {
    db.waTemplate.findUnique.mockResolvedValue(storedTemplate("PENDING"));

    const { plan } = await planAndSend(ctx(), withTemplate);

    expect(plan).toMatchObject({
      ok: false,
      reason: "template_not_approved",
      templateId: "tmpl-1",
    });
  });

  test("with no template at all, an open window still gets the words", async () => {
    (findOpenSession as Mock).mockResolvedValue({ phoneId: "phone-2" });

    const { plan } = await planAndSend(ctx(), wordsOnly);

    expect(plan).toMatchObject({ ok: true, mode: "text", templateId: null, text: wordsOnly.text });
    expect((sendMetaMessage as Mock).mock.calls[0][0].sourceIdentifier).toBe("phone-2");
  });

  test("with no template and no window there is nothing that can be sent", async () => {
    const { plan } = await planAndSend(ctx(), wordsOnly);

    expect(plan).toMatchObject({ ok: false, reason: "no_template" });
    expect(sendMetaMessage).not.toHaveBeenCalled();
  });

  test("a session-only image is refused, not attempted, when the window is closed", async () => {
    const card: LoyaltyMessage = {
      key: "member_card",
      text: "Your card",
      parts: { image: { url: "https://x/c.png" } },
      sessionOnly: true,
    };

    expect(await whatsappChannel.plan(ctx(), card)).toMatchObject({
      ok: false,
      reason: "session_closed",
    });

    (findOpenSession as Mock).mockResolvedValue({ phoneId: null });
    expect(await whatsappChannel.plan(ctx(), card)).toMatchObject({ ok: true, mode: "media" });
  });

  test("a flow goes interactive inside the window and falls back to its template outside", async () => {
    const feedback: LoyaltyMessage = {
      key: "feedback_request",
      text: null,
      parts: { flow: { dbFlowId: "flow-1", context: { surveyTeamMapId: "stm" } } },
      artefacts: { WHATSAPP: { waTemplateId: "tmpl-f", params: ["Ann", "Kettle"] } },
    };
    db.waTemplate.findUnique.mockResolvedValue(storedTemplate("APPROVED", [BODY, BUTTONS]));

    (findOpenSession as Mock).mockResolvedValue({ phoneId: null });
    const inside = await planAndSend(ctx(), feedback);
    expect(inside.plan).toMatchObject({ ok: true, mode: "interactive" });
    expect(sendFlow).toHaveBeenCalledWith(
      expect.objectContaining({ dbFlowId: "flow-1", phone: PHONE }),
    );

    (findOpenSession as Mock).mockResolvedValue(null);
    const outside = await planAndSend(ctx(), feedback);
    expect(outside.plan).toMatchObject({ ok: true, mode: "template", templateId: "tmpl-f" });
  });
});

describe("whatsappChannel.plan — a reply", () => {
  const reply = ctx({ reply: { phoneId: "phone-in" } });

  test("answers on the number the customer wrote to, without checking the window", async () => {
    const { plan } = await planAndSend(reply, wordsOnly);

    expect(plan).toMatchObject({ ok: true, mode: "text" });
    expect(findOpenSession).not.toHaveBeenCalled();
    expect((sendMetaMessage as Mock).mock.calls[0][0].sourceIdentifier).toBe("phone-in");
  });

  test("uses a keyword's template only when it has no words of its own", async () => {
    db.waTemplate.findUnique.mockResolvedValue(storedTemplate());

    const { plan } = await planAndSend(reply, { ...withTemplate, text: null });

    expect(plan).toMatchObject({ ok: true, mode: "template" });
  });

  test("sends a list as an interactive list", async () => {
    await planAndSend(reply, {
      key: "keyword:rewards",
      text: "Pick one",
      parts: { title: "Rewards", list: { button: "View", rows: [{ id: "r1", title: "Tea" }] } },
    });

    expect((sendMetaMessage as Mock).mock.calls[0][0].payload).toMatchObject({
      type: "interactive",
      interactive: { type: "list", header: { type: "text", text: "Rewards" } },
    });
  });

  test("reply buttons without a title carry no header", async () => {
    await planAndSend(reply, {
      key: "event:NEW_CUSTOMER_WELCOME",
      text: "Join us",
      parts: { buttons: [{ id: "LOYALTY_JOIN", title: "Join" }] },
    });

    const payload = (sendMetaMessage as Mock).mock.calls[0][0].payload;
    expect(payload.interactive.type).toBe("button");
    expect(payload.interactive.header).toBeUndefined();
    expect(payload.interactive.action.buttons[0].reply).toEqual({
      id: "LOYALTY_JOIN",
      title: "Join",
    });
  });
});

describe("whatsappChannel.send", () => {
  test("a refusal or a throw is reported, never thrown", async () => {
    (findOpenSession as Mock).mockResolvedValue({ phoneId: null });
    (sendMetaMessage as Mock).mockResolvedValue({ ok: false, error: "No credentials" });
    expect((await planAndSend(ctx(), wordsOnly)).result).toEqual({
      ok: false,
      messageId: undefined,
      error: "No credentials",
    });

    (sendMetaMessage as Mock).mockRejectedValue(new Error("Conversation limit reached"));
    expect((await planAndSend(ctx(), wordsOnly)).result).toEqual({
      ok: false,
      error: "Conversation limit reached",
    });
  });

  test("a template Meta refused is a failed send", async () => {
    db.waTemplate.findUnique.mockResolvedValue(storedTemplate());
    (sendTemplateToUserCore as Mock).mockResolvedValue({ status: false, message: "no channel" });

    expect((await planAndSend(ctx(), withTemplate)).result).toMatchObject({
      ok: false,
      error: "no channel",
    });
  });
});

test("a recipient with no phone cannot be reached on WhatsApp", () => {
  expect(whatsappChannel.isReachable({ ...ctx().recipient, phone: null })).toBe("no_phone");
});
