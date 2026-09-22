import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../../utils/prisma.js", () => ({ default: {}, excludeFields: vi.fn() }));

const handleWaMessages = vi.fn();
const getWaSettingsByPhoneId = vi.fn();
const getWaMessageByMessageId = vi.fn();

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

const { whatsappEventHandler } = await import("./wasurvey.controller.js");

/** The business number the echo arrived on. */
const CHANNEL = "96550334145";
/** The customer the business replied to. */
const CUSTOMER = "96596908846";
const PHONE_ID = "1218749261331967";

/** One `smb_message_echoes` webhook: a reply the business sent from the WA app. */
function echoWebhook() {
  return {
    body: {
      object: "whatsapp_business_account",
      entry: [
        {
          id: "waba-1",
          changes: [
            {
              field: "smb_message_echoes",
              value: {
                messaging_product: "whatsapp",
                metadata: { display_phone_number: CHANNEL, phone_number_id: PHONE_ID },
                message_echoes: [
                  {
                    id: "wamid.echo-1",
                    from: CHANNEL,
                    to: CUSTOMER,
                    type: "text",
                    text: { body: "العملية ٧٥٠" },
                    timestamp: "1789213518",
                  },
                ],
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
  getWaSettingsByPhoneId.mockResolvedValue({
    orgId: "org-1",
    phoneId: PHONE_ID,
    phone: `+${CHANNEL}`,
  });
});

describe("SMB message echoes", () => {
  /**
   * The echo's `to` is the customer. Storing it as the channel made the inbox
   * name the customer's own number as the number the ticket came in on, and left
   * the reply box with no channel to resolve back to — so replies went out on
   * whichever number the org connected first and came back as 131047.
   */
  test("records the business number as the channel, not the customer", async () => {
    // @ts-expect-error — a webhook request is only ever read for `body` here.
    await whatsappEventHandler(echoWebhook(), reply());

    expect(handleWaMessages).toHaveBeenCalledTimes(1);
    const args = handleWaMessages.mock.calls[0];
    expect(args[5]).toBe(CHANNEL);
    // The contact is still addressed by the customer's number.
    expect(args[2]).toBe(CUSTOMER);
  });

  // The inbound handler writes `metadata.display_phone_number`, which carries no
  // `+`. Both halves of a thread have to spell the channel the same way or
  // nothing matches a message back to the number it ran on.
  test("spells the channel the way the inbound handler does", async () => {
    // @ts-expect-error — see above.
    await whatsappEventHandler(echoWebhook(), reply());

    expect(handleWaMessages.mock.calls[0][5]).not.toContain("+");
  });

  test("falls back to the settings row when the webhook omits the number", async () => {
    const webhook = echoWebhook();
    webhook.body.entry[0].changes[0].value.metadata.display_phone_number = "";

    // @ts-expect-error — see above.
    await whatsappEventHandler(webhook, reply());

    expect(handleWaMessages.mock.calls[0][5]).toBe(CHANNEL);
  });
});
