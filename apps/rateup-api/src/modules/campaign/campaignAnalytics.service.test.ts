import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../utils/prisma.js", () => ({
  default: {
    campaign: { findFirst: vi.fn() },
    campaignSend: { findMany: vi.fn() },
  },
}));

import prisma from "../../utils/prisma.js";
import { getCampaignSends } from "./campaignAnalytics.service.js";

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
