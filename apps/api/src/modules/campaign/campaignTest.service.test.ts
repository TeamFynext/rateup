import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../utils/prisma.js", () => ({
  default: { campaign: { findFirst: vi.fn() }, contact: { findMany: vi.fn() } },
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
import { CAMPAIGN_TEST_FLOW_TOKEN } from "../whatsapp/flows/flowToken.js";

type Mock = ReturnType<typeof vi.fn>;
const db = prisma as unknown as { campaign: { findFirst: Mock }; contact: { findMany: Mock } };
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
  db.contact.findMany.mockResolvedValue([]);
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

  test("sends on the template's number — a multi-number org has no default", async () => {
    await sendCampaignTestMessage(CAMPAIGN_ID, ORG, "+919876543210");

    expect(send.mock.calls[0][0].sourceIdentifier).toBe("phone-1");
  });

  test("fills body variables from the campaign's mapping", async () => {
    db.campaign.findFirst.mockResolvedValue({
      id: CAMPAIGN_ID,
      teamId: "team-1",
      waTemplateId: "tpl-1",
      dynamicTags: ["name", "city"],
    });

    await sendCampaignTestMessage(CAMPAIGN_ID, ORG, "+919876543210");

    expect(components.mock.calls[0][0].personalize).toEqual({
      contact: {},
      contactTags: ["name", "city"],
    });
  });

  test("fills variables from the org's contact when the number is one", async () => {
    db.campaign.findFirst.mockResolvedValue({
      id: CAMPAIGN_ID,
      teamId: "team-1",
      waTemplateId: "tpl-1",
      dynamicTags: ["name", "location"],
    });
    // Both spellings of one number exist; the digits-only row is the real one.
    db.contact.findMany.mockResolvedValue([
      { name: null, phone: "+919876543210", customFields: [] },
      {
        name: "Alen Joy",
        phone: "919876543210",
        customFields: [{ value: "Kochi", field: { slug: "location" } }],
      },
    ]);

    await sendCampaignTestMessage(CAMPAIGN_ID, ORG, "+91 98765 43210");

    expect(db.contact.findMany.mock.calls[0][0].where).toEqual({
      orgId: ORG,
      phone: { in: ["919876543210", "+919876543210"] },
    });
    expect(components.mock.calls[0][0].personalize.contact).toEqual({
      name: "Alen Joy",
      customFields: [{ slug: "location", value: "Kochi" }],
    });
  });

  test("leaves the flow button out when the template has none", async () => {
    await sendCampaignTestMessage(CAMPAIGN_ID, ORG, "+919876543210");

    expect(components.mock.calls[0][0].includeFlowButton).toBe(false);
  });

  test("sends a flow button with the test token — Meta rejects the template without it", async () => {
    template.mockResolvedValue({
      data: {
        name: "loyalty_feedback",
        language: "en",
        category: "UTILITY",
        components: [{ type: "BUTTONS", buttons: [{ type: "FLOW", text: "Share feedback" }] }],
      },
      defaultValues: {},
      whatsappSettingsPhoneId: "phone-1",
    });

    await sendCampaignTestMessage(CAMPAIGN_ID, ORG, "+919876543210");

    expect(components.mock.calls[0][0]).toMatchObject({
      includeFlowButton: true,
      flowToken: CAMPAIGN_TEST_FLOW_TOKEN,
    });
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
