import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../utils/prisma.js", () => ({
  default: {
    campaign: { findFirst: vi.fn() },
    campaignSend: { findMany: vi.fn() },
  },
}));

import prisma from "../../utils/prisma.js";
import { buildFunnel, getCampaignSends } from "./campaignAnalytics.service.js";

type Mock = ReturnType<typeof vi.fn>;

const db = prisma as unknown as {
  campaign: { findFirst: Mock };
  campaignSend: { findMany: Mock };
};

const CAMPAIGN_ID = "11111111-1111-1111-1111-111111111111";
const ORG_ID = "22222222-2222-2222-2222-222222222222";

/** A send row with the fields the summary reads; the rest default to zero. */
function row(attemptNo: number, trigger: string, overrides: Record<string, unknown> = {}) {
  return {
    id: `send-${attemptNo}`,
    attemptNo,
    trigger,
    status: "COMPLETED",
    targetStatuses: ["PENDING"],
    dripStageId: null,
    scheduledFor: null,
    startedAt: null,
    completedAt: null,
    totalTargeted: 0,
    totalSkipped: 0,
    totalSent: 0,
    totalDelivered: 0,
    totalRead: 0,
    totalFailed: 0,
    totalCompleted: 0,
    note: null,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  db.campaign.findFirst.mockResolvedValue({ id: CAMPAIGN_ID });
});

describe("send labels", () => {
  test("names each send by what asked for it, not by its position", async () => {
    db.campaignSend.findMany.mockResolvedValue([
      row(0, "MANUAL"),
      row(1, "AUTO_RETRY"),
      row(2, "AUTO_RETRY"),
      // A person asked for these two. Labelling by `attemptNo` called them
      // "Retry 3" and "Retry 4" — a resumed schedule announcing itself as a retry.
      row(3, "MANUAL"),
      row(4, "SCHEDULED"),
    ]);

    const sends = await getCampaignSends(CAMPAIGN_ID, ORG_ID);

    expect(sends.map((send) => send.label)).toEqual([
      "Initial send",
      "Retry 1",
      "Retry 2",
      "Resend",
      "Scheduled send",
    ]);
  });

  test("restarts retry numbering after a send someone asked for", async () => {
    db.campaignSend.findMany.mockResolvedValue([
      row(0, "SCHEDULED"),
      row(1, "AUTO_RETRY"),
      row(2, "MANUAL"),
      // The first retry of the second cycle: "Retry 1", not "Retry 3".
      row(3, "AUTO_RETRY"),
    ]);

    const sends = await getCampaignSends(CAMPAIGN_ID, ORG_ID);

    expect(sends.map((send) => send.label)).toEqual([
      "Initial send",
      "Retry 1",
      "Resend",
      "Retry 1",
    ]);
  });

  test("a drip stage is a drip stage whatever its number", async () => {
    db.campaignSend.findMany.mockResolvedValue([row(0, "DRIP"), row(1, "DRIP")]);

    const sends = await getCampaignSends(CAMPAIGN_ID, ORG_ID);

    expect(sends.map((send) => send.label)).toEqual(["Drip stage", "Drip stage"]);
  });
});

describe("buildFunnel", () => {
  const at = (funnel: ReturnType<typeof buildFunnel>, key: string) =>
    funnel.find((stage) => stage.key === key)!;

  test("a recipient a retry recovered is dispatched once, not twice", () => {
    // The reported campaign: 114 recipients, one of them rejected on the first
    // attempt and re-sent, so `CampaignStats.totalSend` stood at 115. Counting
    // messages there read as "115 dispatched — 101% of recipients".
    const funnel = buildFunnel({
      attempted: 114,
      pending: 0,
      delivered: 107,
      read: 78,
      replied: 0,
    });

    expect(at(funnel, "sent").count).toBe(114);
    expect(at(funnel, "sent").rateOfPrevious).toBe(1);
    expect(at(funnel, "delivered").rateOfPrevious).toBeCloseTo(107 / 114, 5);
    expect(at(funnel, "read").rateOfPrevious).toBeCloseTo(78 / 107, 5);
  });

  test("recipients still awaiting a first attempt are not dispatched", () => {
    const funnel = buildFunnel({
      attempted: 100,
      pending: 40,
      delivered: 55,
      read: 20,
      replied: 3,
    });

    expect(at(funnel, "sent").count).toBe(60);
    expect(at(funnel, "sent").rateOfPrevious).toBeCloseTo(0.6, 5);
  });

  test("no stage reports above 100%, whatever order the receipts land in", () => {
    // A delivery receipt for the first attempt arriving after the retry went out.
    const funnel = buildFunnel({ attempted: 10, pending: 0, delivered: 11, read: 12, replied: 13 });

    for (const stage of funnel) {
      expect(stage.rateOfPrevious ?? 0).toBeLessThanOrEqual(1);
      expect(stage.rateOfAttempted ?? 0).toBeLessThanOrEqual(1);
    }
  });

  test("an empty campaign reports no rates rather than dividing by zero", () => {
    const funnel = buildFunnel({ attempted: 0, pending: 0, delivered: 0, read: 0, replied: 0 });

    expect(funnel.every((stage) => stage.rateOfAttempted === null)).toBe(true);
    expect(at(funnel, "sent").count).toBe(0);
  });
});
