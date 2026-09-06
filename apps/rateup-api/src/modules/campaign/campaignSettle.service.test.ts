import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../utils/prisma.js", () => ({
  default: {
    campaign: { findUnique: vi.fn(), findMany: vi.fn(), updateMany: vi.fn() },
    campaignSend: { findMany: vi.fn() },
  },
}));
vi.mock("../../utils/logger.js", () => ({
  log: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), trace: vi.fn() },
}));
vi.mock("./campaignSend.service.js", async () => {
  const actual = await vi.importActual<typeof import("./campaignSend.service.js")>(
    "./campaignSend.service.js",
  );
  return { LIVE_SEND_STATUSES: actual.LIVE_SEND_STATUSES, cancelCampaignSends: vi.fn() };
});
vi.mock("./campaignRetryCohort.js", () => ({
  getRetryCohort: vi.fn(),
  countInFlightParticipants: vi.fn(),
}));

import prisma from "../../utils/prisma.js";
import { CampaignStatus } from "../../types/enums.js";
import { cancelCampaignSends } from "./campaignSend.service.js";
import { countInFlightParticipants, getRetryCohort } from "./campaignRetryCohort.js";
import { finishCampaignIfSettled, settleSentCampaigns } from "./campaignSettle.service.js";

type Mock = ReturnType<typeof vi.fn>;

const db = prisma as unknown as {
  campaign: { findUnique: Mock; findMany: Mock; updateMany: Mock };
  campaignSend: { findMany: Mock };
};
const cancel = cancelCampaignSends as unknown as Mock;
const cohort = getRetryCohort as unknown as Mock;
const inFlight = countInFlightParticipants as unknown as Mock;

const CAMPAIGN_ID = "11111111-1111-1111-1111-111111111111";

describe("finishCampaignIfSettled", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    db.campaign.findUnique.mockResolvedValue({ id: CAMPAIGN_ID, type: "WHATSAPP" });
    db.campaignSend.findMany.mockResolvedValue([]);
    db.campaign.updateMany.mockResolvedValue({ count: 1 });
    inFlight.mockResolvedValue(0);
    cohort.mockResolvedValue([]);
  });

  test("completes a campaign whose messages all landed", async () => {
    await expect(finishCampaignIfSettled(CAMPAIGN_ID)).resolves.toBe(CampaignStatus.COMPLETED);

    const call = db.campaign.updateMany.mock.calls[0][0];
    expect(call.data.status).toBe(CampaignStatus.COMPLETED);
    expect(call.data.endedAt).toBeInstanceOf(Date);
  });

  // The bug this pass exists for: a retry is booked at drain time, while the
  // outcome is still unknown. Once nothing failed, that attempt is pointless and
  // must not leave the campaign claiming it is retrying.
  test("cancels a booked retry and completes when nothing failed retryably", async () => {
    db.campaignSend.findMany.mockResolvedValue([{ status: "SCHEDULED" }]);

    await expect(finishCampaignIfSettled(CAMPAIGN_ID)).resolves.toBe(CampaignStatus.COMPLETED);

    expect(cancel).toHaveBeenCalledWith(
      CAMPAIGN_ID,
      expect.objectContaining({ onlyScheduled: true }),
    );
    expect(db.campaign.updateMany.mock.calls[0][0].data.status).toBe(CampaignStatus.COMPLETED);
  });

  test("retries when something failed retryably and an attempt is booked", async () => {
    db.campaignSend.findMany.mockResolvedValue([{ status: "SCHEDULED" }]);
    cohort.mockResolvedValue(["p-1"]);

    await expect(finishCampaignIfSettled(CAMPAIGN_ID)).resolves.toBe(CampaignStatus.RETRYING);

    expect(cancel).not.toHaveBeenCalled();
    // A retry window is still ahead of it, so the campaign has not ended.
    expect(db.campaign.updateMany.mock.calls[0][0].data.endedAt).toBeUndefined();
  });

  test("completes when failures remain but the retry policy has booked nothing", async () => {
    cohort.mockResolvedValue(["p-1"]);

    await expect(finishCampaignIfSettled(CAMPAIGN_ID)).resolves.toBe(CampaignStatus.COMPLETED);
  });

  test("waits while delivery statuses are still arriving", async () => {
    inFlight.mockResolvedValue(4);

    await expect(finishCampaignIfSettled(CAMPAIGN_ID)).resolves.toBeNull();
    expect(db.campaign.updateMany).not.toHaveBeenCalled();
    // Concluding here is what announced a retry the campaign did not need.
    expect(cohort).not.toHaveBeenCalled();
  });

  test("leaves the campaign alone while another send is actively dispatching", async () => {
    db.campaignSend.findMany.mockResolvedValue([{ status: "RUNNING" }]);

    await expect(finishCampaignIfSettled(CAMPAIGN_ID)).resolves.toBeNull();
    expect(db.campaign.updateMany).not.toHaveBeenCalled();
  });

  test("never settles a drip campaign", async () => {
    db.campaign.findUnique.mockResolvedValue({ id: CAMPAIGN_ID, type: "DRIP" });

    await expect(finishCampaignIfSettled(CAMPAIGN_ID)).resolves.toBeNull();
    expect(db.campaign.updateMany).not.toHaveBeenCalled();
  });

  test("reports nothing when the status guard skipped the write", async () => {
    db.campaign.updateMany.mockResolvedValue({ count: 0 });

    await expect(finishCampaignIfSettled(CAMPAIGN_ID)).resolves.toBeNull();
  });

  test("does nothing for a campaign that no longer exists", async () => {
    db.campaign.findUnique.mockResolvedValue(null);

    await expect(finishCampaignIfSettled(CAMPAIGN_ID)).resolves.toBeNull();
  });
});

describe("settleSentCampaigns", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    db.campaign.findUnique.mockResolvedValue({ id: CAMPAIGN_ID, type: "WHATSAPP" });
    db.campaignSend.findMany.mockResolvedValue([]);
    db.campaign.updateMany.mockResolvedValue({ count: 1 });
    inFlight.mockResolvedValue(0);
    cohort.mockResolvedValue([]);
  });

  test("only looks at campaigns that have actually dispatched", async () => {
    db.campaign.findMany.mockResolvedValue([]);

    await settleSentCampaigns();

    expect(db.campaign.findMany.mock.calls[0][0].where.CampaignSend).toEqual({ some: {} });
  });

  test("counts the campaigns it settled", async () => {
    db.campaign.findMany.mockResolvedValue([{ id: CAMPAIGN_ID }, { id: "other" }]);

    await expect(settleSentCampaigns()).resolves.toEqual({ settled: 2 });
  });

  test("one campaign's failure does not stop the sweep", async () => {
    db.campaign.findMany.mockResolvedValue([{ id: "boom" }, { id: CAMPAIGN_ID }]);
    db.campaign.findUnique
      .mockRejectedValueOnce(new Error("db is down"))
      .mockResolvedValue({ id: CAMPAIGN_ID, type: "WHATSAPP" });

    await expect(settleSentCampaigns()).resolves.toEqual({ settled: 1 });
  });
});
