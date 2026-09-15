import { describe, expect, it } from "vitest";

import { CampaignStatus } from "@/types/enums.ts";

import { campaignStatusMeta, matchesCampaignStatusFilter } from "./campaignStatus.tsx";

describe("PAUSED campaign status", () => {
  it("reads as paused, but coloured as a problem rather than a choice", () => {
    const meta = campaignStatusMeta(CampaignStatus.PAUSED);
    expect(meta.label).toBe("Paused");
    expect(meta.badge).toContain("destructive");
    expect(meta.live).toBe(false);
  });

  it("is found by the Paused filter alongside owner-paused campaigns", () => {
    expect(matchesCampaignStatusFilter(CampaignStatus.PAUSED, "INACTIVE")).toBe(true);
    expect(matchesCampaignStatusFilter(CampaignStatus.INACTIVE, "INACTIVE")).toBe(true);
    expect(matchesCampaignStatusFilter(CampaignStatus.PAUSED, "FAILED")).toBe(false);
  });
});
