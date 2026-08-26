import { describe, expect, test } from "vitest";

import { planBannerCopy } from "./PlanBanner";

/** Tests read the English source strings, so translation is the identity here. */
const t = (key: string) => key;

describe("what the plan banner offers", () => {
  test("never mentions add-ons to a free org", () => {
    // Add-ons attach to a paid subscription. Offering one to a free plan sends the
    // customer down a dead end — upgrading is the only remedy they have.
    const standing = planBannerCopy("free", true, "", t);
    const atLimit = planBannerCopy("limit", true, "conversations", t);

    expect(standing.message).not.toMatch(/add-on/i);
    expect(atLimit.message).not.toMatch(/add-on/i);
  });

  test("points a free org at upgrading, in both states", () => {
    expect(planBannerCopy("free", true, "", t).cta).toBe("Upgrade");
    expect(planBannerCopy("limit", true, "conversations", t).cta).toBe("Upgrade");
    expect(planBannerCopy("limit", true, "conversations", t).message).toMatch(
      /Upgrade to keep going/,
    );
  });

  test("offers a paying org both an add-on and an upgrade", () => {
    expect(planBannerCopy("paid", false, "conversations", t).message).toMatch(/add-on/i);
    expect(planBannerCopy("limit", false, "conversations", t).message).toMatch(
      /Upgrade or add an add-on/,
    );
  });

  test("names what actually ran out", () => {
    const copy = planBannerCopy("limit", false, "conversations, form submissions", t);

    expect(copy.message).toContain("conversations, form submissions");
    expect(copy.message).toContain("for this billing period.");
  });

  test("the running-low message names the allowance that is nearly gone", () => {
    const copy = planBannerCopy("paid", false, "conversations", t);

    expect(copy.message).toBe(
      "You are running low on conversations. Add an add-on or move up a plan for higher limits.",
    );
  });
});
