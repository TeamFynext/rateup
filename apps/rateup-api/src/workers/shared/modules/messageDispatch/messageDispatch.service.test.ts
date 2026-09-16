import { beforeEach, describe, expect, test, vi } from "vitest";

const client = vi.hoisted(() => ({ query: vi.fn(async () => ({})), release: vi.fn() }));
vi.mock("../../../../utils/db.js", () => ({
  default: { connect: vi.fn(async () => client), query: vi.fn(async () => ({})) },
}));
vi.mock("../../logger.js", () => ({
  log: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));
vi.mock("../../../../modules/whatsapp/whatsappSurvey/wasurvey.utils.js", () => ({
  createTemplateMessage: vi.fn((to: string) => ({ to })),
}));
vi.mock("../../../../modules/whatsapp/meta/metaMessage.service.js", () => ({
  sendMetaMessage: vi.fn(),
}));
vi.mock("../../../../modules/whatsapp/whatsappSurvey/wasurvey.auth.js", () => {
  class ConversationLimitError extends Error {}
  return { ConversationLimitError };
});
vi.mock("../../../../modules/whatsapp/messageTemplates/templateComponents.js", () => ({
  buildTemplateComponents: vi.fn(async () => []),
}));
vi.mock("../../../../modules/whatsapp/flows/flowToken.js", () => ({ signFlowToken: vi.fn() }));
vi.mock("../../campaign.js", () => ({
  updateCampaignParticipant: vi.fn(),
  updateCampaignSendStats: vi.fn(),
  updateCampaignStats: vi.fn(),
  updateDripCampaignParticipant: vi.fn(),
  updateDripCampaignStats: vi.fn(),
}));
// The real module reaches Prisma and Redis; only the code-to-reason rule is kept.
vi.mock("../../../../modules/campaign/campaignPause.service.js", () => ({
  pauseReasonForMetaError: (code?: number | null) => (code === 131042 ? "PAYMENT_METHOD" : null),
  isCampaignSendPaused: vi.fn(async () => false),
  pauseCampaignForAccountIssue: vi.fn(async () => true),
}));

import dbPool from "../../../../utils/db.js";
import { sendMetaMessage } from "../../../../modules/whatsapp/meta/metaMessage.service.js";
import { ConversationLimitError } from "../../../../modules/whatsapp/whatsappSurvey/wasurvey.auth.js";
import { updateCampaignParticipant, updateCampaignStats } from "../../campaign.js";
import {
  isCampaignSendPaused,
  pauseCampaignForAccountIssue,
} from "../../../../modules/campaign/campaignPause.service.js";
import { CampaignPauseReason } from "../../../../types/enums.js";
import { WaFailureClass } from "../../../../utils/waRetryableErrors.js";
import { processParticipant } from "./messageDispatch.service.js";

type Mock = ReturnType<typeof vi.fn>;
const send = sendMetaMessage as unknown as Mock;
const paused = isCampaignSendPaused as unknown as Mock;
const pause = pauseCampaignForAccountIssue as unknown as Mock;

const CAMPAIGN_ID = "11111111-1111-1111-1111-111111111111";

const participant = {
  id: "p1",
  name: "Ada",
  phone: "919999999999",
  customFields: [],
  data: { name: "promo", language: "en", components: [] },
  orgId: "org1",
  defaultValues: {},
  dynamicTags: [],
  surveyTeamMapId: "",
  accessToken: "token",
  phoneId: "phone1",
  contactId: "c1",
  campaignId: CAMPAIGN_ID,
  campaignSendId: "send1",
  sourceIdentifier: "918888888888",
  teamId: "team1",
} as never;

describe("processParticipant — account-wide failures pause the campaign", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    paused.mockResolvedValue(false);
  });

  test("pauses on the conversation limit and leaves the recipient untouched", async () => {
    send.mockRejectedValue(new ConversationLimitError("limit"));

    await expect(processParticipant(participant)).resolves.toEqual({ ok: false, paused: true });

    expect(pause).toHaveBeenCalledWith(CAMPAIGN_ID, CampaignPauseReason.CONVERSATION_LIMIT);
    expect(updateCampaignParticipant).not.toHaveBeenCalled();
    expect(updateCampaignStats).not.toHaveBeenCalled();
    // Meta was never called, so not even the usage counter moves.
    expect(dbPool.connect).not.toHaveBeenCalled();
    expect(dbPool.query).not.toHaveBeenCalled();
  });

  test("pauses on Meta's payment-method error, counting the call but not a failure", async () => {
    send.mockResolvedValue({ ok: false, error: "payment", detail: { code: 131042 } });

    await expect(processParticipant(participant)).resolves.toEqual({ ok: false, paused: true });

    expect(pause).toHaveBeenCalledWith(CAMPAIGN_ID, CampaignPauseReason.PAYMENT_METHOD);
    expect(dbPool.query).toHaveBeenCalledTimes(1);
    expect(updateCampaignParticipant).not.toHaveBeenCalled();
    expect(updateCampaignStats).not.toHaveBeenCalled();
  });

  test("skips a send that is already paused without calling Meta", async () => {
    paused.mockResolvedValue(true);

    await expect(processParticipant(participant)).resolves.toEqual({ ok: false, paused: true });

    expect(send).not.toHaveBeenCalled();
    expect(pause).not.toHaveBeenCalled();
  });

  test("still books an ordinary per-recipient failure as FAILED", async () => {
    send.mockResolvedValue({ ok: false, error: "undeliverable", detail: { code: 131026 } });

    await expect(processParticipant(participant)).resolves.toEqual({
      ok: false,
      failureClass: WaFailureClass.PERMANENT,
    });

    expect(pause).not.toHaveBeenCalled();
    expect(updateCampaignParticipant).toHaveBeenCalledWith(
      "p1",
      expect.objectContaining({ status: "FAILED" }),
      client,
    );
  });
});
