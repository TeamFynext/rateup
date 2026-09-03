import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("./campaign.service.js", () => ({
  getCampaignParticipantCountByStatuses: vi.fn(),
}));
vi.mock("../subscription/conversationBudget.js", () => ({ getConversationBudget: vi.fn() }));

import { getCampaignParticipantCountByStatuses } from "./campaign.service.js";
import { getConversationBudget } from "../subscription/conversationBudget.js";
import { getCampaignSendPreflight } from "./campaign.preflight.js";
import { CampaignParticipantStatus } from "../../types/enums.js";

const STATUSES = [CampaignParticipantStatus.PENDING];

function budget(max: number, used: number, isAnnual = false) {
  vi.mocked(getConversationBudget).mockResolvedValue({
    metered: true,
    max,
    used,
    remaining: Math.max(max - used, 0),
    isAnnual,
  });
}

describe("what a campaign would cost before it is sent", () => {
  beforeEach(() => {
    vi.mocked(getCampaignParticipantCountByStatuses).mockReset().mockResolvedValue(50);
    vi.mocked(getConversationBudget).mockReset();
  });

  test("names the shortfall when the campaign outruns what is left", async () => {
    // The case worth warning about: 50 people, 45 conversations. Before this, the sender
    // learned about it as five messages that silently failed in a worker.
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

  test("flags an allowance that is already spent", async () => {
    budget(5_000, 5_000);

    expect(await getCampaignSendPreflight("c1", "org-1", STATUSES)).toMatchObject({
      remaining: 0,
      exhausted: true,
      shortfall: 50,
    });
  });

  test("treats an over-spent allowance as empty rather than negative", async () => {
    budget(5_000, 5_200);

    const preflight = await getCampaignSendPreflight("c1", "org-1", STATUSES);

    expect(preflight.remaining).toBe(0);
    expect(preflight.shortfall).toBe(50);
  });

  test("warns about nothing on an uncapped plan", async () => {
    // Enterprise without a contracted ceiling: there is no number to run out of.
    vi.mocked(getConversationBudget).mockResolvedValue({
      metered: false,
      used: 0,
      isAnnual: false,
    });

    expect(await getCampaignSendPreflight("c1", "org-1", STATUSES)).toMatchObject({
      recipients: 50,
      metered: false,
      shortfall: 0,
      exhausted: false,
    });
  });

  test("measures an annual allowance against the annual counter", async () => {
    // The budget has already multiplied out the twelve months; the preflight must not do
    // it a second time.
    budget(60_000, 59_970, true);

    expect(await getCampaignSendPreflight("c1", "org-1", STATUSES)).toMatchObject({
      remaining: 30,
      shortfall: 20,
      isAnnual: true,
    });
  });
});
