import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../../utils/prisma.js", () => ({ default: {}, excludeFields: vi.fn() }));

const handleWaMessages = vi.fn();
const getWaSettingsByPhoneId = vi.fn();
const getWaMessageByMessageId = vi.fn();
const handleMessageStatusUpdate = vi.fn();
const getAiBotActiveStatus = vi.fn();
const enqueueWebhookDispatch = vi.fn();
const releasePendingSignupBonusByPhone = vi.fn();
const recordMetaAiTokenUsage = vi.fn();

vi.mock("../inbox/message/wamessage.controller.js", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  handleWaMessages,
}));
vi.mock("../settings/wa_settings.service.js", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getWaSettingsByPhoneId,
}));
vi.mock("../inbox/message/wamessage.service.js", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getWaMessageByMessageId,
}));
vi.mock("./wasurvey.service.js", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  handleMessageStatusUpdate,
  getAiBotActiveStatus,
}));
vi.mock("../../webhook/webhook.service.js", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  enqueueWebhookDispatch,
}));
vi.mock("../../loyalty/accounts/account.service.js", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  releasePendingSignupBonusByPhone,
}));

vi.mock("../../metaAgent/metaAgent.usage.js", () => ({ recordMetaAiTokenUsage }));
const handleStaticFlowReply = vi.fn();
vi.mock("../flows/flow.service.js", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  handleStaticFlowReply,
}));
const setMetaAgentThreadOwner = vi.fn();
vi.mock("../../metaAgent/metaAgent.threadOwner.js", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  setMetaAgentThreadOwner,
}));

const { whatsappEventHandler } = await import("./wasurvey.controller.js");
const { isMetaAiOriginated } = await import("./wasurvey.utils.js");

const CHANNEL = "15551323034";
const PHONE_ID = "259643180556398";
const CUSTOMER = "919188346187";
const BIZAI = '{"originator":"bizai","channel":"ent"}';

/** A `standby` webhook as Meta sent it while the Business Agent held the thread. */
function standbyWebhook(standby: Record<string, unknown>) {
  return {
    body: {
      object: "whatsapp_business_account",
      entry: [
        {
          id: "238205772710930",
          changes: [
            {
              field: "standby",
              value: {
                messaging_product: "whatsapp",
                metadata: { display_phone_number: CHANNEL, phone_number_id: PHONE_ID },
                standby,
              },
            },
          ],
        },
      ],
    },
  };
}

const reply = () => {
  const r = { code: vi.fn(() => r), send: vi.fn(() => r) };
  return r;
};

beforeEach(() => {
  vi.clearAllMocks();
  getWaMessageByMessageId.mockResolvedValue(null);
  handleWaMessages.mockResolvedValue({ contactId: "contact-1" });
  getWaSettingsByPhoneId.mockResolvedValue({
    orgId: "org-1",
    phoneId: PHONE_ID,
    phone: `+${CHANNEL}`,
  });
});

describe("standby webhooks (Meta Business Agent threads)", () => {
  test("stores the customer's message without running our own automations", async () => {
    const webhook = standbyWebhook({
      contacts: [{ profile: { name: "Alen Joy" }, wa_id: CUSTOMER }],
      messages: [
        {
          from: CUSTOMER,
          id: "wamid.inbound-1",
          timestamp: "1790056876",
          text: { body: "What about pricing" },
          type: "text",
        },
      ],
    });

    // @ts-expect-error — a webhook request is only ever read for `body` here.
    await whatsappEventHandler(webhook, reply());

    expect(handleWaMessages).toHaveBeenCalledTimes(1);
    const [type, , from, orgId, , , , messageId] = handleWaMessages.mock.calls[0];
    expect(type).toBe("receive");
    expect(from).toBe(CUSTOMER);
    expect(orgId).toBe("org-1");
    expect(messageId).toBe("wamid.inbound-1");
    // The agent is answering; nothing of ours may reply as well.
    expect(getAiBotActiveStatus).not.toHaveBeenCalled();
    expect(releasePendingSignupBonusByPhone).not.toHaveBeenCalled();
    // …and the inbox is told the AI holds the thread, as of the message's time.
    expect(setMetaAgentThreadOwner).toHaveBeenCalledWith({
      orgId: "org-1",
      phone: CUSTOMER,
      owner: "AI",
      at: new Date(1790056876 * 1000),
    });
  });

  test("saves a survey flow Meta AI sent, without anything of ours replying", async () => {
    const webhook = standbyWebhook({
      contacts: [{ profile: { name: "Alen Joy" }, wa_id: CUSTOMER }],
      messages: [
        {
          from: CUSTOMER,
          id: "wamid.flow-reply",
          timestamp: "1790056876",
          context: { id: "wamid.agent-flow" },
          interactive: {
            type: "nfm_reply",
            nfm_reply: { name: "flow", body: "Sent", response_json: '{"flow_token":"meta"}' },
          },
          type: "interactive",
        },
      ],
    });

    // @ts-expect-error — a webhook request is only ever read for `body` here.
    await whatsappEventHandler(webhook, reply());

    expect(handleStaticFlowReply).toHaveBeenCalledWith("org-1", expect.anything(), {
      agentHeld: true,
    });
    expect(getAiBotActiveStatus).not.toHaveBeenCalled();
  });

  test("stores the agent's reply as an automated send to the customer", async () => {
    const webhook = standbyWebhook({
      message_echoes: [
        {
          id: "wamid.ai-reply-1",
          timestamp: "1790056886",
          message: {
            to: CUSTOMER,
            recipient: "IN.1684570989242773",
            type: "text",
            recipient_type: "individual",
            biz_opaque_callback_data: BIZAI,
            text: { body: "We offer a *Conversation pack*…", preview_url: "true" },
          },
        },
      ],
    });

    // @ts-expect-error — see above.
    await whatsappEventHandler(webhook, reply());

    expect(handleWaMessages).toHaveBeenCalledTimes(1);
    const args = handleWaMessages.mock.calls[0];
    expect(args[0]).toBe("send");
    // Flattened: the send itself, with the wrapper's id and the Meta AI tag kept.
    expect(args[1]).toMatchObject({
      id: "wamid.ai-reply-1",
      to: CUSTOMER,
      type: "text",
      biz_opaque_callback_data: BIZAI,
    });
    expect(args[2]).toBe(CUSTOMER);
    expect(args[5]).toBe(CHANNEL);
    expect(args[7]).toBe("wamid.ai-reply-1");
    expect(args[11]).toBe("AUTOMATED");
    expect(args[12]).toBe(true);
    // Counted against the AI token allowance, once it is stored.
    expect(recordMetaAiTokenUsage).toHaveBeenCalledWith({
      orgId: "org-1",
      contactId: "contact-1",
      replyBody: expect.objectContaining({ id: "wamid.ai-reply-1" }),
    });
  });

  test("does not store an echo twice", async () => {
    getWaMessageByMessageId.mockResolvedValue({ id: "existing" });
    const webhook = standbyWebhook({
      message_echoes: [
        {
          id: "wamid.ai-reply-1",
          timestamp: "1790056886",
          message: { to: CUSTOMER, type: "text", biz_opaque_callback_data: BIZAI, text: {} },
        },
      ],
    });

    // @ts-expect-error — see above.
    await whatsappEventHandler(webhook, reply());

    expect(handleWaMessages).not.toHaveBeenCalled();
    expect(recordMetaAiTokenUsage).not.toHaveBeenCalled();
  });

  test("applies delivery statuses for the agent's reply", async () => {
    const webhook = standbyWebhook({
      contacts: [{ wa_id: CUSTOMER }],
      statuses: [
        {
          id: "wamid.ai-reply-1",
          status: "delivered",
          timestamp: "1790056886",
          recipient_id: CUSTOMER,
          biz_opaque_callback_data: BIZAI,
        },
      ],
    });

    // @ts-expect-error — see above.
    await whatsappEventHandler(webhook, reply());

    expect(handleMessageStatusUpdate).toHaveBeenCalledWith(
      "delivered",
      "wamid.ai-reply-1",
      undefined,
      undefined,
    );
  });
});

describe("isMetaAiOriginated", () => {
  test("recognises Meta AI's tag and nothing else", () => {
    expect(isMetaAiOriginated(BIZAI)).toBe(true);
    expect(isMetaAiOriginated('{"originator":"someone-else"}')).toBe(false);
    expect(isMetaAiOriginated("not json")).toBe(false);
    expect(isMetaAiOriginated(undefined)).toBe(false);
  });
});
