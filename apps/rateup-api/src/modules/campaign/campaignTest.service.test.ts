import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../utils/prisma.js", () => ({
  default: { campaign: { findFirst: vi.fn() } },
}));
vi.mock("../../utils/logger.js", () => ({
  log: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));
vi.mock("../whatsapp/messageTemplates/wa_templates.service.js", () => ({
  getDbTemplate: vi.fn(),
}));
vi.mock("../whatsapp/messageTemplates/templateComponents.js", () => ({
  buildTemplateComponents: vi.fn(),
}));
vi.mock("../whatsapp/meta/metaMessage.service.js", () => ({ sendMetaMessage: vi.fn() }));

import prisma from "../../utils/prisma.js";
import { buildTemplateComponents } from "../whatsapp/messageTemplates/templateComponents.js";
import { getDbTemplate } from "../whatsapp/messageTemplates/wa_templates.service.js";
import { sendMetaMessage } from "../whatsapp/meta/metaMessage.service.js";
import { CampaignNotFoundError } from "./campaign.errors.js";
import { CampaignTestSendError, sendCampaignTestMessage } from "./campaignTest.service.js";

type Mock = ReturnType<typeof vi.fn>;
const db = prisma as unknown as { campaign: { findFirst: Mock } };
const template = getDbTemplate as unknown as Mock;
const components = buildTemplateComponents as unknown as Mock;
const send = sendMetaMessage as unknown as Mock;

const CAMPAIGN_ID = "11111111-1111-1111-1111-111111111111";
const ORG = "org-1";

beforeEach(() => {
  vi.clearAllMocks();
  db.campaign.findFirst.mockResolvedValue({
    id: CAMPAIGN_ID,
    teamId: "team-1",
    waTemplateId: "tpl-1",
    dynamicTags: [],
  });
  template.mockResolvedValue({
    data: { name: "diwali_flash_sale_v2", language: "en", category: "MARKETING" },
    defaultValues: {},
    whatsappSettingsPhoneId: "phone-1",
  });
  components.mockResolvedValue([]);
  send.mockResolvedValue({ ok: true, messageId: "wamid.1" });
});

describe("sendCampaignTestMessage", () => {
  test("sends the campaign's own template to the given number", async () => {
    await expect(sendCampaignTestMessage(CAMPAIGN_ID, ORG, "+91 98765 43210")).resolves.toEqual({
      messageId: "wamid.1",
    });

    // Digits only: Meta rejects a number with spaces in it.
    expect(send.mock.calls[0][0].to).toBe("+919876543210");
    expect(send.mock.calls[0][0].messageType).toBe("TEMPLATE");
  });

  test("leaves the flow button out — a test has no participant to file a response against", async () => {
    await sendCampaignTestMessage(CAMPAIGN_ID, ORG, "+919876543210");

    expect(components.mock.calls[0][0].includeFlowButton).toBe(false);
  });

  test("opens no send session and touches no participant", async () => {
    await sendCampaignTestMessage(CAMPAIGN_ID, ORG, "+919876543210");

    // A test that appeared in the attempts table would corrupt every per-attempt
    // number the analytics tab is built on.
    expect(send.mock.calls[0][0].campaign).toBeUndefined();
  });

  test("refuses a campaign in another org", async () => {
    db.campaign.findFirst.mockResolvedValue(null);

    await expect(sendCampaignTestMessage(CAMPAIGN_ID, "org-b", "+919876543210")).rejects.toThrow(
      CampaignNotFoundError,
    );
  });

  test("refuses when the campaign has no template yet", async () => {
    db.campaign.findFirst.mockResolvedValue({
      id: CAMPAIGN_ID,
      teamId: "team-1",
      waTemplateId: null,
      dynamicTags: [],
    });

    await expect(sendCampaignTestMessage(CAMPAIGN_ID, ORG, "+919876543210")).rejects.toThrow(
      CampaignTestSendError,
    );
    expect(send).not.toHaveBeenCalled();
  });

  test("surfaces Meta's own reason when it rejects the test", async () => {
    send.mockResolvedValue({ ok: false, error: "Template is paused" });

    await expect(sendCampaignTestMessage(CAMPAIGN_ID, ORG, "+919876543210")).rejects.toThrow(
      "Template is paused",
    );
  });
});
