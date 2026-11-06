import { beforeEach, describe, expect, test, vi } from "vite-plus/test";

const client = vi.hoisted(() => ({ query: vi.fn(async () => ({})), release: vi.fn() }));
vi.mock("../../../../utils/db.js", () => ({
  default: { connect: vi.fn(async () => client), query: vi.fn(async () => ({})) },
}));
vi.mock("../../../../utils/redisConnection.js", () => ({ default: {} }));
vi.mock("../../usageCounter.js", () => ({ incrementUsage: vi.fn(async () => {}) }));
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
  class CampaignCreditsExhaustedError extends Error {}
  return { CampaignCreditsExhaustedError };
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

vi.mock("../../accessTokenCache.js", () => ({
  resolveCampaignAccessToken: vi.fn(async () => "cached-token"),
}));

import dbPool from "../../../../utils/db.js";
import { resolveCampaignAccessToken } from "../../accessTokenCache.js";
import { incrementUsage } from "../../usageCounter.js";
import { sendMetaMessage } from "../../../../modules/whatsapp/meta/metaMessage.service.js";
import { CampaignCreditsExhaustedError } from "../../../../modules/whatsapp/whatsappSurvey/wasurvey.auth.js";
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

  test("pauses when campaign credits run out and leaves the recipient untouched", async () => {
    send.mockRejectedValue(new CampaignCreditsExhaustedError("limit"));

    await expect(processParticipant(participant)).resolves.toEqual({ ok: false, paused: true });

    expect(pause).toHaveBeenCalledWith(CAMPAIGN_ID, CampaignPauseReason.CAMPAIGN_CREDIT_LIMIT);
    expect(updateCampaignParticipant).not.toHaveBeenCalled();
    expect(updateCampaignStats).not.toHaveBeenCalled();
    // Meta was never called, so not even the usage counter moves.
    expect(incrementUsage).not.toHaveBeenCalled();
    expect(dbPool.connect).not.toHaveBeenCalled();
    expect(dbPool.query).not.toHaveBeenCalled();
  });

  test("pauses on Meta's payment-method error, counting the call but not a failure", async () => {
    send.mockResolvedValue({ ok: false, error: "payment", detail: { code: 131042 } });

    await expect(processParticipant(participant)).resolves.toEqual({ ok: false, paused: true });

    expect(pause).toHaveBeenCalledWith(CAMPAIGN_ID, CampaignPauseReason.PAYMENT_METHOD);
    expect(incrementUsage).toHaveBeenCalledWith(expect.anything(), "org1", "messagesCount");
    // The count is buffered in Redis, not written to the hot UsageStats row.
    expect(dbPool.query).not.toHaveBeenCalled();
    expect(dbPool.connect).not.toHaveBeenCalled();
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

  test("counts an accepted send without taking a pooled connection", async () => {
    send.mockResolvedValue({ ok: true, messageId: "wamid.1" });

    await expect(processParticipant(participant)).resolves.toEqual({ ok: true });

    expect(incrementUsage).toHaveBeenCalledTimes(1);
    expect(dbPool.connect).not.toHaveBeenCalled();
  });

  test("defers a transient failure with attempts left, still counting the call", async () => {
    send.mockResolvedValue({ ok: false, error: "throttled", detail: { code: 131000 } });

    await expect(processParticipant(participant, { isFinalAttempt: false })).resolves.toEqual({
      ok: false,
      failureClass: WaFailureClass.TRANSIENT,
    });

    expect(incrementUsage).toHaveBeenCalledTimes(1);
    expect(dbPool.connect).not.toHaveBeenCalled();
    expect(updateCampaignParticipant).not.toHaveBeenCalled();
  });
});

describe("processParticipant — send-path correctness", () => {
  const resolveToken = resolveCampaignAccessToken as unknown as Mock;
  const { accessToken: _legacy, ...tokenless } = participant as Record<string, unknown>;
  const newJob = tokenless as never;
  const usageBumps = () =>
    (client.query.mock.calls as unknown[][]).filter((call) =>
      String(call[0]).includes("UsageStats"),
    ).length;

  beforeEach(() => {
    vi.clearAllMocks();
    paused.mockResolvedValue(false);
    resolveToken.mockResolvedValue("cached-token");
    send.mockResolvedValue({ ok: true, messageId: "wamid.1" });
  });

  test("resolves the token by phone id when the job carries none", async () => {
    await expect(processParticipant(newJob)).resolves.toEqual({ ok: true });

    expect(resolveToken).toHaveBeenCalledWith("org1", "phone1");
    expect(send.mock.calls[0][0].credentials.accessToken).toBe("cached-token");
  });

  test("uses the token on a job enqueued before tokens left job data", async () => {
    await processParticipant(participant);

    expect(resolveToken).not.toHaveBeenCalled();
    expect(send.mock.calls[0][0].credentials.accessToken).toBe("token");
  });

  test("books a permanent failure, without calling Meta, when no token resolves", async () => {
    resolveToken.mockResolvedValue(null);

    await expect(processParticipant(newJob, { isFinalAttempt: false })).resolves.toEqual({
      ok: false,
      failureClass: WaFailureClass.PERMANENT,
    });

    expect(send).not.toHaveBeenCalled();
    expect(updateCampaignParticipant).toHaveBeenCalled();
    expect(usageBumps()).toBe(0);
  });

  test("passes the job id through as the idempotency key", async () => {
    await processParticipant(newJob, { idempotencyKey: "send1_p1" });

    expect(send.mock.calls[0][0].idempotencyKey).toBe("send1_p1");
  });

  test("does not count a replayed send against usage a second time", async () => {
    send.mockResolvedValue({ ok: true, messageId: "wamid.1", replayed: true });

    await expect(processParticipant(newJob)).resolves.toEqual({ ok: true });

    expect(usageBumps()).toBe(0);
  });

  test("treats an HTML 502 as transient so BullMQ retries it", async () => {
    send.mockResolvedValue({
      ok: false,
      error: "Error calling Meta API",
      detail: { message: "Error calling Meta API", httpStatus: 502 },
    });

    await expect(processParticipant(newJob, { isFinalAttempt: false })).resolves.toEqual({
      ok: false,
      failureClass: WaFailureClass.TRANSIENT,
    });
    // Deferred: the retry may still succeed.
    expect(updateCampaignParticipant).not.toHaveBeenCalled();
  });

  test("never hands a timed-out send back to BullMQ, since it may have been delivered", async () => {
    send.mockResolvedValue({
      ok: false,
      error: "timeout",
      detail: { code: -1, transportCode: "ECONNABORTED" },
    });

    await expect(processParticipant(newJob, { isFinalAttempt: false })).resolves.toEqual({
      ok: false,
      failureClass: WaFailureClass.RETRY_LATER,
    });
    expect(updateCampaignParticipant).toHaveBeenCalled();
  });
});
