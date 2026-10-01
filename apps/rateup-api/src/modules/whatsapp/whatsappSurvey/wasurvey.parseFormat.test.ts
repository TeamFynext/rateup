import { describe, expect, test, vi } from "vitest";

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

import { parseToWhatsAppFormat } from "./wasurvey.utils.js";

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
