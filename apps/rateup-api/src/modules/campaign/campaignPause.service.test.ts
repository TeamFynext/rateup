import { beforeEach, describe, expect, test, vi } from "vitest";

const pipeline = { set: vi.fn(), exec: vi.fn(async () => []) };
vi.mock("../../utils/redisConnection.js", () => ({
  default: { exists: vi.fn(), multi: vi.fn(() => pipeline) },
}));
vi.mock("../../utils/prisma.js", () => ({
  default: {
    campaign: { updateMany: vi.fn() },
    campaignSend: { findMany: vi.fn() },
  },
}));
vi.mock("../../utils/logger.js", () => ({
  log: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));
vi.mock("./campaignCancel.service.js", () => ({
  cancelPendingCampaignJobs: vi.fn(async () => ({ removed: 3, locked: 0, sends: 1 })),
}));
vi.mock("./campaignSend.service.js", () => ({
  LIVE_SEND_STATUSES: ["SCHEDULED", "QUEUING", "RUNNING"],
  cancelCampaignSends: vi.fn(async () => 1),
}));

import baseRedis from "../../utils/redisConnection.js";
import prisma from "../../utils/prisma.js";
import { CampaignPauseReason, CampaignStatus } from "../../types/enums.js";
import { cancelPendingCampaignJobs } from "./campaignCancel.service.js";
import { cancelCampaignSends } from "./campaignSend.service.js";
import {
  CAMPAIGN_PAUSE_MESSAGES,
  isCampaignSendPaused,
  pauseCampaignForAccountIssue,
  pauseReasonForMetaError,
} from "./campaignPause.service.js";

type Mock = ReturnType<typeof vi.fn>;
const db = prisma as unknown as {
  campaign: { updateMany: Mock };
  campaignSend: { findMany: Mock };
};
const redis = baseRedis as unknown as { exists: Mock };

const CAMPAIGN_ID = "11111111-1111-1111-1111-111111111111";
const SEND_ID = "22222222-2222-2222-2222-222222222222";

describe("pauseReasonForMetaError", () => {
  test("pauses for Meta's payment-method error", () => {
    expect(pauseReasonForMetaError(131042)).toBe(CampaignPauseReason.PAYMENT_METHOD);
  });

  test("does not pause for a per-recipient failure", () => {
    for (const code of [131026, 131049, 130429, 132001, undefined, null]) {
      expect(pauseReasonForMetaError(code)).toBeNull();
    }
  });
});

describe("pauseCampaignForAccountIssue", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    db.campaign.updateMany.mockResolvedValue({ count: 1 });
    db.campaignSend.findMany.mockResolvedValue([{ id: SEND_ID }]);
  });

  test("moves a sending campaign to PAUSED with the reason and its message", async () => {
    await expect(
      pauseCampaignForAccountIssue(CAMPAIGN_ID, CampaignPauseReason.CONVERSATION_LIMIT),
    ).resolves.toBe(true);

    const call = db.campaign.updateMany.mock.calls[0][0];
    expect(call.where.status.in).toEqual(
      expect.arrayContaining([CampaignStatus.ACTIVE, CampaignStatus.QUEUING]),
    );
    // The owner's own stop wins over the platform's.
    expect(call.where.status.in).not.toContain(CampaignStatus.DEQUEUING);
    expect(call.where.status.in).not.toContain(CampaignStatus.INACTIVE);
    expect(call.data).toMatchObject({
      status: CampaignStatus.PAUSED,
      pauseReason: CampaignPauseReason.CONVERSATION_LIMIT,
      errorMessage: CAMPAIGN_PAUSE_MESSAGES[CampaignPauseReason.CONVERSATION_LIMIT],
    });
    expect(call.data.pausedAt).toBeInstanceOf(Date);
  });

  test("flags every live send, then dequeues and closes them", async () => {
    await pauseCampaignForAccountIssue(CAMPAIGN_ID, CampaignPauseReason.PAYMENT_METHOD);

    expect(pipeline.set).toHaveBeenCalledWith(
      `campaignSend:${SEND_ID}:paused`,
      CampaignPauseReason.PAYMENT_METHOD,
      "EX",
      expect.any(Number),
    );
    expect(cancelPendingCampaignJobs).toHaveBeenCalledWith(CAMPAIGN_ID);
    expect(cancelCampaignSends).toHaveBeenCalledWith(CAMPAIGN_ID, {
      note: CAMPAIGN_PAUSE_MESSAGES[CampaignPauseReason.PAYMENT_METHOD],
    });
  });

  // 250 concurrent jobs hit the same limit; only the one that claimed the
  // campaign may walk the queue.
  test("does nothing further when another caller already paused it", async () => {
    db.campaign.updateMany.mockResolvedValue({ count: 0 });

    await expect(
      pauseCampaignForAccountIssue(CAMPAIGN_ID, CampaignPauseReason.CONVERSATION_LIMIT),
    ).resolves.toBe(false);

    expect(pipeline.set).not.toHaveBeenCalled();
    expect(cancelPendingCampaignJobs).not.toHaveBeenCalled();
    expect(cancelCampaignSends).not.toHaveBeenCalled();
  });

  test("still reports the pause when the queue cleanup fails", async () => {
    (cancelPendingCampaignJobs as unknown as Mock).mockRejectedValueOnce(new Error("redis down"));

    await expect(
      pauseCampaignForAccountIssue(CAMPAIGN_ID, CampaignPauseReason.CONVERSATION_LIMIT),
    ).resolves.toBe(true);
  });
});

describe("isCampaignSendPaused", () => {
  test("reads the send's flag", async () => {
    redis.exists.mockResolvedValueOnce(1);
    await expect(isCampaignSendPaused(SEND_ID)).resolves.toBe(true);
    redis.exists.mockResolvedValueOnce(0);
    await expect(isCampaignSendPaused(SEND_ID)).resolves.toBe(false);
    expect(redis.exists).toHaveBeenCalledWith(`campaignSend:${SEND_ID}:paused`);
  });
});
