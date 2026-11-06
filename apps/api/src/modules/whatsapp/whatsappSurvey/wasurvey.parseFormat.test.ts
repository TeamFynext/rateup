import { describe, expect, test, vi } from "vite-plus/test";

vi.mock("../../../utils/prisma.js", () => ({ default: {} }));
vi.mock("../../../utils/redisConnection.js", () => ({ default: {} }));
vi.mock("../../../utils/upload/s3Upload.js", () => ({
  getFileUrlFromKey: vi.fn(),
  uploadFile: vi.fn(),
}));
vi.mock("../wa_axios.js", () => ({ callMetaApi: vi.fn() }));
vi.mock("./wasurvey.service.js", () => ({ sendMessage: vi.fn() }));
vi.mock("../../integrations/shopify/shopify.catalog.js", () => ({
  captureShopifyOrderPayment: vi.fn(),
}));

import { createAudioMessage, parseMessage, parseToWhatsAppFormat } from "./wasurvey.utils.js";
import { PlatformType } from "../../../generated/prisma/enums.js";

describe("parseToWhatsAppFormat", () => {
  test("keeps a Shift+Enter line break as a newline", () => {
    expect(
      parseToWhatsAppFormat({
        content: [
          {
            type: "paragraph",
            content: [
              { type: "text", text: "Hi" },
              { type: "hardBreak" },
              { type: "text", text: "there" },
            ],
          },
        ],
      }),
    ).toBe("Hi\nthere");
  });
});

describe("createAudioMessage", () => {
  test("marks a WhatsApp voice note so it shows as one", () => {
    const body = createAudioMessage("15550001", "https://f/v.ogg", PlatformType.WHATSAPP, true);
    expect(body).toMatchObject({ type: "audio", audio: { link: "https://f/v.ogg", voice: true } });
  });

  test("leaves a plain audio file unmarked", () => {
    const body = createAudioMessage("15550001", "https://f/a.mp3", PlatformType.WHATSAPP);
    expect((body as any).audio).toEqual({ link: "https://f/a.mp3" });
  });

  test("Instagram has no voice flag to set", () => {
    const body = createAudioMessage("ig-1", "https://f/v.ogg", PlatformType.INSTAGRAM, true);
    expect(JSON.stringify(body)).not.toContain("voice");
  });
});

describe("parseMessage", () => {
  const body = (value: Record<string, unknown>) =>
    ({
      object: "whatsapp_business_account",
      entry: [
        {
          id: "waba",
          changes: [
            {
              field: "messages",
              value: {
                messaging_product: "whatsapp",
                metadata: { display_phone_number: "1555", phone_number_id: "p1" },
                messages: [
                  {
                    from: "15550001",
                    id: "wamid.1",
                    timestamp: "1",
                    type: "text",
                    text: { body: "hi" },
                  },
                ],
                ...value,
              },
            },
          ],
        },
      ],
    }) as any;

  test("reads the sender's profile name", () => {
    const parsed = parseMessage(
      body({ contacts: [{ wa_id: "15550001", profile: { name: "Asha" } }] }),
    );
    expect(parsed.userName).toBe("Asha");
  });

  test("a message without contacts still parses, with no name", () => {
    expect(parseMessage(body({})).userName).toBeUndefined();
  });

  test("a contact without a profile still parses, with no name", () => {
    expect(parseMessage(body({ contacts: [{ wa_id: "15550001" }] })).userName).toBeUndefined();
  });
});
