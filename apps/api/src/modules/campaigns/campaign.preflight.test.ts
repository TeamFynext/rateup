import { beforeEach, describe, expect, test, vi } from "vite-plus/test";

vi.mock("./campaign.service.js", () => ({
  getCampaignParticipantCountByStatuses: vi.fn(),
  getCampaignParticipantCountByIds: vi.fn(),
  getCampaignMessagesPerRecipient: vi.fn(),
}));
vi.mock("../settings/subscription/campaignCredits.js", () => ({
  getCampaignCreditBudget: vi.fn(),
}));

import {
  getCampaignMessagesPerRecipient,
  getCampaignParticipantCountByIds,
  getCampaignParticipantCountByStatuses,
} from "./campaign.service.js";
import { getCampaignCreditBudget } from "../settings/subscription/campaignCredits.js";
import { getCampaignSendPreflight } from "./campaign.preflight.js";
import { CampaignParticipantStatus } from "../../types/enums.js";

const STATUSES = [CampaignParticipantStatus.PENDING];

const PERIOD = new Date("2026-10-01T00:00:00Z");

function budget(planMax: number, planUsed: number, packRemaining = 0) {
  const remaining = Math.max(planMax - planUsed, 0) + packRemaining;
  vi.mocked(getCampaignCreditBudget).mockResolvedValue({
    metered: true,
    period: PERIOD,
    planMax,
    planUsed,
    packRemaining,
    remaining,
    exhausted: remaining <= 0,
  });
}

describe("what a campaign would cost before it is sent", () => {
  beforeEach(() => {
    vi.mocked(getCampaignParticipantCountByStatuses).mockReset().mockResolvedValue(50);
    vi.mocked(getCampaignParticipantCountByIds).mockReset().mockResolvedValue(1);
    vi.mocked(getCampaignCreditBudget).mockReset();
    // A broadcast unless a test says otherwise: one message per recipient.
    vi.mocked(getCampaignMessagesPerRecipient).mockReset().mockResolvedValue(1);
  });

  test("counts a drip's whole sequence, not just its audience", async () => {
    // 50 recipients across 3 stages is 150 messages. Counting the audience alone
    // told a sender with 60 left that it fit, and the send then stopped two
    // thirds of the way through the first stage.
    vi.mocked(getCampaignMessagesPerRecipient).mockResolvedValue(3);
    budget(5_000, 4_940);

    const result = await getCampaignSendPreflight("campaign-1", "org-1", STATUSES);

    expect(result.recipients).toBe(50);
    expect(result.messagesPerRecipient).toBe(3);
    expect(result.shortfall).toBe(90);
  });

  test("a drip that fits reports no shortfall", async () => {
    vi.mocked(getCampaignMessagesPerRecipient).mockResolvedValue(3);
    budget(5_000, 4_000);

    const result = await getCampaignSendPreflight("campaign-1", "org-1", STATUSES);

    expect(result.shortfall).toBe(0);
  });

  test("names the shortfall when the campaign outruns what is left", async () => {
    // The case worth warning about: 50 people, 45 credits.
    budget(5_000, 4_955);

    const preflight = await getCampaignSendPreflight("c1", "org-1", STATUSES);

    expect(preflight.recipients).toBe(50);
    expect(preflight.remaining).toBe(45);
    expect(preflight.shortfall).toBe(5);
    expect(preflight.exhausted).toBe(false);
  });

  test("reports no shortfall when the campaign fits", async () => {
    budget(5_000, 100);

    expect(await getCampaignSendPreflight("c1", "org-1", STATUSES)).toMatchObject({
      shortfall: 0,
      exhausted: false,
    });
  });

  test("flags credits that are already spent", async () => {
    budget(5_000, 5_000);

    expect(await getCampaignSendPreflight("c1", "org-1", STATUSES)).toMatchObject({
      remaining: 0,
      exhausted: true,
      shortfall: 50,
    });
  });

  test("treats over-spent plan credits as empty rather than negative", async () => {
    budget(5_000, 5_200);

    const preflight = await getCampaignSendPreflight("c1", "org-1", STATUSES);

    expect(preflight.remaining).toBe(0);
    expect(preflight.shortfall).toBe(50);
  });

  test("warns about nothing on an uncapped plan", async () => {
    // Enterprise without a contracted ceiling: there is no number to run out of.
    vi.mocked(getCampaignCreditBudget).mockResolvedValue({
      metered: false,
      period: PERIOD,
      planUsed: 0,
      packRemaining: 0,
      exhausted: false,
    });

    expect(await getCampaignSendPreflight("c1", "org-1", STATUSES)).toMatchObject({
      recipients: 50,
      metered: false,
      shortfall: 0,
      exhausted: false,
    });
  });

  test("counts pack credits once the plan's are spent", async () => {
    budget(10_000, 10_000, 30);

    expect(await getCampaignSendPreflight("c1", "org-1", STATUSES)).toMatchObject({
      max: 10_000,
      used: 10_000,
      packRemaining: 30,
      remaining: 30,
      exhausted: false,
      shortfall: 20,
    });
  });
});

describe("a resend that names its recipients", () => {
  beforeEach(() => {
    vi.mocked(getCampaignParticipantCountByStatuses).mockReset().mockResolvedValue(0);
    vi.mocked(getCampaignParticipantCountByIds).mockReset().mockResolvedValue(1);
    vi.mocked(getCampaignCreditBudget).mockReset();
    budget(5_000, 0);
  });

  test("counts the cohort, not the statuses it was sent alongside", async () => {
    // The bug this covers: "Retry now" on one recipient was refused with "No
    // participants with the specified statuses" whenever the campaign held none
    // in that status — a filter the fan-out was never going to apply to a named
    // recipient anyway.
    const preflight = await getCampaignSendPreflight("c1", "org-1", STATUSES, ["p1"]);

    expect(preflight.recipients).toBe(1);
    expect(getCampaignParticipantCountByIds).toHaveBeenCalledWith("c1", "org-1", ["p1"]);
    expect(getCampaignParticipantCountByStatuses).not.toHaveBeenCalled();
  });

  test("still refuses a cohort the campaign no longer holds", async () => {
    vi.mocked(getCampaignParticipantCountByIds).mockResolvedValue(0);

    expect((await getCampaignSendPreflight("c1", "org-1", STATUSES, ["gone"])).recipients).toBe(0);
  });
});
