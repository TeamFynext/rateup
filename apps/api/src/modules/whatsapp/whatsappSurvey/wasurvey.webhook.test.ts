import { beforeEach, describe, expect, test, vi } from "vitest";

// Everything the processor reaches is mocked, so this exercises only how a delivery
// is walked: every entry, change, message and status, each status under its own type.
vi.mock("../../../utils/prisma.js", () => ({ default: {}, excludeFields: vi.fn() }));
vi.mock("../../../utils/redisConnection.js", () => ({ default: {} }));
vi.mock("../../../utils/upload/s3Upload.js", () => ({
  getFileUrlFromKey: vi.fn(),
  uploadFile: vi.fn(),
}));
vi.mock("../wa_axios.js", () => ({ callMetaApi: vi.fn() }));
vi.mock("../../integrations/shopify/shopify.catalog.js", () => ({
  captureShopifyOrderPayment: vi.fn(),
}));

const handleWaMessages = vi.fn();
const getWaSettingsByPhoneId = vi.fn();
const getWaMessageByMessageId = vi.fn();
const handleMessageStatusUpdate = vi.fn();
const enqueueWebhookDispatch = vi.fn();
const phoneSubscribesTo = vi.fn();
const handleAutomatedReply = vi.fn();

vi.mock("../settings/wa_settings.service.js", () => ({
  getWaSettingsByPhoneId,
  getWaSettings: vi.fn(),
  getWaSettingsByPhone: vi.fn(),
  updateWaSettingsStatusByWabaId: vi.fn(),
}));
vi.mock("./wasurvey.service.js", () => ({
  handleLeadGen: vi.fn(),
  handleMessageStatusUpdate,
  sendMessage: vi.fn(),
  sendTextMessage: vi.fn(),
}));
vi.mock("./wasurvey.controller.js", () => ({
  handleAutomatedReply,
  handleButtonClickInteraction: vi.fn(),
  handleWaJoinRegistration: vi.fn(),
}));
vi.mock("../inbox/message/wamessage.controller.js", () => ({ handleWaMessages }));
vi.mock("../inbox/message/wamessage.service.js", () => ({
  getWaMessageByMessageId,
  markWaMessageAsDeleted: vi.fn(),
}));
vi.mock("../inbox/message/inboundNotify.js", () => ({ notifyInboundMessage: vi.fn() }));
vi.mock("../../webhook/webhook.service.js", () => ({ enqueueWebhookDispatch }));
vi.mock("../../webhook/webhook.events.js", () => ({ phoneSubscribesTo }));
vi.mock("../calling/calling.service.js", () => ({ handleCallsWebhook: vi.fn() }));
vi.mock("../messageTemplates/wa_templates.service.js", () => ({
  getTemplateWithHSMId: vi.fn(),
  updateTemplateInDb: vi.fn(),
}));
vi.mock("../../survey/survey.service.js", () => ({
  updateStartedSurvey: vi.fn(),
  updateVisitedSurvey: vi.fn(),
}));
vi.mock("../flows/flow.service.js", () => ({
  getSurveyTeamMapWithFlow: vi.fn(),
  handleStaticFlowReply: vi.fn(),
  sendFlow: vi.fn(),
}));
vi.mock("../../metaAgent/metaAgent.usage.js", () => ({ recordMetaAiTokenUsage: vi.fn() }));
vi.mock("../../metaAgent/metaAgent.threadOwner.js", () => ({
  metaTimestampToDate: vi.fn(),
  resolveHandoverOwner: vi.fn(),
  setMetaAgentThreadOwner: vi.fn(),
}));
vi.mock("../../contact/contact.service.js", () => ({ handleContactConsent: vi.fn() }));
vi.mock("../../org/org.services.js", () => ({ getOrgById: vi.fn() }));
vi.mock("../../subscription/activeContacts.js", () => ({ canMessageContact: vi.fn() }));
vi.mock("../../stats/stats.service.js", () => ({ updateMonthlyStat: vi.fn() }));
vi.mock("../../loyalty/settings/settings.service.js", () => ({
  getLoyaltyWaCommandByRequestMessage: vi.fn(),
  handleLoyaltyRedeemInteraction: vi.fn(),
  handleLoyaltyWaCommand: vi.fn(),
}));
vi.mock("../catalog/catalog.service.js", () => ({ handleWaOrderfromCatalog: vi.fn() }));
vi.mock("../../loyalty/accounts/account.service.js", () => ({
  releasePendingSignupBonusByPhone: vi.fn(),
}));
vi.mock("../../loyalty/loyaltyEventTemplates.js", () => ({ isJoinTap: vi.fn(() => false) }));
vi.mock("../../loyalty/messaging/reply.js", () => ({}));
vi.mock("../../loyalty/newCustomerWelcome.js", () => ({ sendNewCustomerWelcomeIfDue: vi.fn() }));
vi.mock("../../loyalty/accounts/memberCard.service.js", () => ({ sendMemberCardIfDue: vi.fn() }));
vi.mock("../../org/ws/org.ws.controller.js", () => ({ sendViaWstoOrgHandler: vi.fn() }));
vi.mock("../../notification/notify.js", () => ({ notify: vi.fn() }));

const { processWhatsappWebhook } = await import("./wasurvey.webhook.js");

const PHONE_ID = "259643180556398";
const metadata = { display_phone_number: "15551323034", phone_number_id: PHONE_ID };

const text = (from: string, id: string, body: string) => ({
  from,
  id,
  timestamp: "1790056876",
  type: "text",
  text: { body },
});
const contact = (waId: string) => ({ profile: { name: `name-${waId}` }, wa_id: waId });
const receipt = (id: string, status: string) => ({
  id,
  status,
  timestamp: "1790056876",
  recipient_id: "911",
});

function delivery(...changes: { field: string; value: object }[][]) {
  return {
    object: "whatsapp_business_account",
    entry: changes.map((entryChanges, i) => ({ id: `waba-${i}`, changes: entryChanges })),
  } as never;
}

beforeEach(() => {
  vi.clearAllMocks();
  getWaMessageByMessageId.mockResolvedValue(null);
  handleWaMessages.mockResolvedValue({ contactId: "contact-1" });
  getWaSettingsByPhoneId.mockResolvedValue({ orgId: "org-1", phoneId: PHONE_ID });
  handleMessageStatusUpdate.mockResolvedValue(undefined);
  phoneSubscribesTo.mockResolvedValue(true);
});

describe("processWhatsappWebhook - messages", () => {
  test("stores and answers every message in a change, in order, each with its own sender", async () => {
    await processWhatsappWebhook(
      delivery([
        {
          field: "messages",
          value: {
            metadata,
            contacts: [contact("911"), contact("922")],
            messages: [text("911", "m1", "hello"), text("922", "m2", "hi there")],
          },
        },
      ]),
    );

    expect(handleWaMessages.mock.calls.map((call) => [call[2], call[7], call[6]])).toEqual([
      ["911", "m1", "name-911"],
      ["922", "m2", "name-922"],
    ]);
    expect(handleAutomatedReply.mock.calls.map((call) => [call[3], call[4]])).toEqual([
      ["911", "hello"],
      ["922", "hi there"],
    ]);
  });

  test("handles every entry and every change, not just the first", async () => {
    await processWhatsappWebhook(
      delivery(
        [
          {
            field: "messages",
            value: { metadata, contacts: [contact("911")], messages: [text("911", "m1", "a")] },
          },
          {
            field: "messages",
            value: { metadata, contacts: [contact("911")], messages: [text("911", "m2", "b")] },
          },
        ],
        [
          {
            field: "messages",
            value: { metadata, contacts: [contact("933")], messages: [text("933", "m3", "c")] },
          },
        ],
      ),
    );

    expect(handleWaMessages.mock.calls.map((call) => call[7])).toEqual(["m1", "m2", "m3"]);
  });

  test("keeps going after one message fails, then reports the failure", async () => {
    handleWaMessages.mockRejectedValueOnce(new Error("db down"));

    await expect(
      processWhatsappWebhook(
        delivery([
          {
            field: "messages",
            value: {
              metadata,
              contacts: [contact("911")],
              messages: [text("911", "m1", "a"), text("911", "m2", "b")],
            },
          },
        ]),
      ),
    ).rejects.toThrow("db down");

    expect(handleWaMessages.mock.calls.map((call) => call[7])).toEqual(["m1", "m2"]);
  });
});

describe("processWhatsappWebhook - statuses", () => {
  test("applies each status under its own type", async () => {
    await processWhatsappWebhook(
      delivery([
        {
          field: "messages",
          value: {
            metadata,
            statuses: [receipt("a", "sent"), receipt("b", "delivered"), receipt("c", "read")],
          },
        },
      ]),
    );

    expect(handleMessageStatusUpdate.mock.calls.map(([type, id]) => [type, id]).sort()).toEqual(
      [
        ["sent", "a"],
        ["delivered", "b"],
        ["read", "c"],
      ].sort(),
    );
    expect(enqueueWebhookDispatch).toHaveBeenCalledTimes(3);
    expect(enqueueWebhookDispatch).toHaveBeenCalledWith(
      PHONE_ID,
      "message_status",
      expect.objectContaining({ status: "delivered", messageId: "b" }),
    );
  });

  test("queues no outgoing webhook for an org that does not subscribe", async () => {
    phoneSubscribesTo.mockResolvedValue(false);

    await processWhatsappWebhook(
      delivery([
        {
          field: "messages",
          value: { metadata, statuses: [receipt("a", "sent"), receipt("b", "read")] },
        },
      ]),
    );

    expect(handleMessageStatusUpdate).toHaveBeenCalledTimes(2);
    expect(enqueueWebhookDispatch).not.toHaveBeenCalled();
    // One lookup answers the whole batch.
    expect(phoneSubscribesTo).toHaveBeenCalledTimes(1);
    expect(phoneSubscribesTo).toHaveBeenCalledWith(PHONE_ID, "message_status");
  });

  test("throws when a receipt could not reach status-events, after the others went", async () => {
    handleMessageStatusUpdate.mockRejectedValueOnce(new Error("broker down"));

    await expect(
      processWhatsappWebhook(
        delivery([
          {
            field: "messages",
            value: { metadata, statuses: [receipt("a", "sent"), receipt("b", "read")] },
          },
        ]),
      ),
    ).rejects.toThrow("broker down");

    expect(handleMessageStatusUpdate).toHaveBeenCalledTimes(2);
  });

  test("handles statuses in every change of a delivery", async () => {
    await processWhatsappWebhook(
      delivery([
        { field: "messages", value: { metadata, statuses: [receipt("a", "sent")] } },
        { field: "messages", value: { metadata, statuses: [receipt("b", "failed")] } },
      ]),
    );

    expect(handleMessageStatusUpdate.mock.calls.map(([type, id]) => [type, id])).toEqual([
      ["sent", "a"],
      ["failed", "b"],
    ]);
  });
});

describe("processWhatsappWebhook - nothing to do", () => {
  test.each([
    ["no entries", { object: "whatsapp_business_account", entry: [] }],
    ["no changes", { object: "whatsapp_business_account", entry: [{ id: "w", changes: [] }] }],
    [
      "an empty change",
      { object: "whatsapp_business_account", entry: [{ id: "w", changes: [{}] }] },
    ],
    ["no body", undefined],
  ])("resolves quietly for %s", async (_name, body) => {
    await expect(processWhatsappWebhook(body as never)).resolves.toBeUndefined();

    expect(handleWaMessages).not.toHaveBeenCalled();
    expect(handleMessageStatusUpdate).not.toHaveBeenCalled();
  });
});
