import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../utils/prisma.js", () => ({
  default: {
    campaign: { findFirst: vi.fn() },
    $queryRaw: vi.fn(),
  },
}));

import prisma from "../../utils/prisma.js";
import { CampaignStatus, CampaignType } from "../../types/enums.js";
import { getDripSchedule } from "./campaignDrip.service.js";

const CAMPAIGN_ID = "11111111-1111-1111-1111-111111111111";
const ORG = "org-1";
const NOW = new Date("2026-03-10T12:00:00Z");
const STARTED = new Date("2026-03-01T09:00:00Z");

function campaign(overrides: Record<string, unknown> = {}) {
  vi.mocked(prisma.campaign.findFirst).mockResolvedValue({
    type: CampaignType.DRIP,
    status: CampaignStatus.ACTIVE,
    startedAt: STARTED,
    ...overrides,
  } as never);
}

function stages(rows: Record<string, unknown>[]) {
  vi.mocked(prisma.$queryRaw).mockResolvedValue(rows as never);
}

function stage(overrides: Record<string, unknown> = {}) {
  return {
    dripStageId: "stage-1",
    delay: 2,
    delayUnit: "days",
    sendAtTime: null,
    templateName: "welcome",
    pending: 5n,
    sent: 0n,
    earliestJoin: STARTED,
    lastSentAt: null,
    ...overrides,
  };
}

/**
 * A drip books no `CampaignSend` ahead of time, so this is the only place the
 * page can learn when the next stage goes out.
 */
describe("getDripSchedule", () => {
  beforeEach(() => {
    vi.mocked(prisma.campaign.findFirst).mockReset();
    vi.mocked(prisma.$queryRaw).mockReset();
  });

  test("dates each stage from the earliest recipient still waiting on it", async () => {
    campaign();
    stages([stage({ dripStageId: "s1", delay: 2 }), stage({ dripStageId: "s2", delay: 30 })]);

    const schedule = await getDripSchedule(CAMPAIGN_ID, ORG, NOW);

    expect(schedule?.stages.map((s) => s.nextDueAt)).toEqual([
      "2026-03-03T09:00:00.000Z",
      "2026-03-31T09:00:00.000Z",
    ]);
    expect(schedule?.stages.map((s) => s.position)).toEqual([1, 2]);
  });

  test("leads with the stage that fires soonest", async () => {
    campaign();
    stages([stage({ dripStageId: "s1", delay: 30 }), stage({ dripStageId: "s2", delay: 20 })]);

    const schedule = await getDripSchedule(CAMPAIGN_ID, ORG, NOW);

    expect(schedule?.next?.dripStageId).toBe("s2");
  });

  test("marks a stage whose moment has passed as overdue", async () => {
    // Due on the 3rd, and it is the 10th: the next cron tick takes it.
    campaign();
    stages([stage({ delay: 2 })]);

    const schedule = await getDripSchedule(CAMPAIGN_ID, ORG, NOW);

    expect(schedule?.stages[0].overdue).toBe(true);
  });

  test("a stage nobody is waiting on has no due date, but keeps the date it went out", async () => {
    // Every current recipient is READ/DELIVERED, so there is nothing left for the
    // cron — but the stage still happened, and a card that showed only a forecast
    // went blank on a finished sequence instead of showing when it ran.
    const sentAt = new Date("2026-03-04T09:00:00Z");
    campaign();
    stages([stage({ pending: 0n, sent: 12n, earliestJoin: null, lastSentAt: sentAt })]);

    const schedule = await getDripSchedule(CAMPAIGN_ID, ORG, NOW);

    expect(schedule?.stages[0]).toMatchObject({
      pending: 0,
      sent: 12,
      nextDueAt: null,
      lastSentAt: "2026-03-04T09:00:00.000Z",
      overdue: false,
    });
    expect(schedule?.next).toBeNull();
  });

  test("says when the campaign is paused, dates and all", async () => {
    // The dates still exist — nothing is acting on them, which is the point of
    // saying so rather than hiding the card.
    campaign({ status: CampaignStatus.INACTIVE });
    stages([stage()]);

    const schedule = await getDripSchedule(CAMPAIGN_ID, ORG, NOW);

    expect(schedule?.running).toBe(false);
    expect(schedule?.next?.nextDueAt).toBe("2026-03-03T09:00:00.000Z");
  });

  test("is nothing at all for a broadcast", async () => {
    campaign({ type: CampaignType.WHATSAPP });

    expect(await getDripSchedule(CAMPAIGN_ID, ORG, NOW)).toBeNull();
    expect(prisma.$queryRaw).not.toHaveBeenCalled();
  });

  test("is nothing for a campaign in another org", async () => {
    vi.mocked(prisma.campaign.findFirst).mockResolvedValue(null as never);

    expect(await getDripSchedule(CAMPAIGN_ID, ORG, NOW)).toBeNull();
  });
});
