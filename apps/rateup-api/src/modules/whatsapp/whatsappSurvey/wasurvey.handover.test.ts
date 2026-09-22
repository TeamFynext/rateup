import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../../utils/prisma.js", () => ({ default: {}, excludeFields: vi.fn() }));

const getWaSettingsByPhoneId = vi.fn();
const setMetaAgentThreadOwner = vi.fn();

vi.mock("../settings/wa_settings.service.js", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getWaSettingsByPhoneId,
}));
vi.mock("../../metaAgent/metaAgent.threadOwner.js", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  setMetaAgentThreadOwner,
}));

const { whatsappEventHandler } = await import("./wasurvey.controller.js");

const PHONE_ID = "259643180556398";
const CUSTOMER = "919188346187";

/** A `messaging_handovers` webhook, shaped as Meta delivered it. */
function handoverWebhook(detail: Record<string, unknown>) {
  return {
    body: {
      object: "whatsapp_business_account",
      entry: [
        {
          id: "238205772710930",
          changes: [
            {
              field: "messaging_handovers",
              value: {
                messaging_product: "whatsapp",
                recipient: { display_phone_number: "15551323034", phone_number_id: PHONE_ID },
                sender: { phone_number: CUSTOMER },
                timestamp: "1790063417",
                ...detail,
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
  getWaSettingsByPhoneId.mockResolvedValue({ orgId: "org-1", phoneId: PHONE_ID });
});

describe("messaging_handovers webhooks", () => {
  test("an escalation from Meta AI hands the thread to staff, with Meta's reason", async () => {
    const webhook = handoverWebhook({
      type: "control_passed",
      control_passed: {
        previous_owner_app_id: "1143680903703001",
        previous_owner_app_role: "meta_business_agent",
        previous_owner_role: "ai_agent",
        new_owner_role: "escalation",
        metadata: "customer_request",
      },
    });

    // @ts-expect-error — a webhook request is only ever read for `body` here.
    await whatsappEventHandler(webhook, reply());

    expect(getWaSettingsByPhoneId).toHaveBeenCalledWith(PHONE_ID);
    expect(setMetaAgentThreadOwner).toHaveBeenCalledWith({
      orgId: "org-1",
      phone: CUSTOMER,
      owner: "STAFF",
      reason: "customer_request",
      at: new Date(1790063417 * 1000),
    });
  });

  test("control passed back to the agent puts the AI in charge again", async () => {
    const webhook = handoverWebhook({
      type: "control_passed",
      control_passed: { previous_owner_role: "escalation", new_owner_role: "ai_agent" },
    });

    // @ts-expect-error — see above.
    await whatsappEventHandler(webhook, reply());

    expect(setMetaAgentThreadOwner).toHaveBeenCalledWith(
      expect.objectContaining({ owner: "AI", reason: null }),
    );
  });

  test("a payload that names no new owner is ignored rather than guessed at", async () => {
    const webhook = handoverWebhook({ type: "something_new", something_new: {} });

    // @ts-expect-error — see above.
    await whatsappEventHandler(webhook, reply());

    expect(setMetaAgentThreadOwner).not.toHaveBeenCalled();
  });
});
