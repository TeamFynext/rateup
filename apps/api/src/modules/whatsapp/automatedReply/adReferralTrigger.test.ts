import { describe, expect, test } from "vite-plus/test";
import { adRuleMatches, adRuleSpecificity } from "./adReferralTrigger.js";

const ad = { sourceId: "ad-1", headline: "Summer Sale", sourceUrl: "https://fb.me/abc" };

describe("which ad a came-from-an-ad rule answers", () => {
  test("every ad when it names none", () => {
    expect(adRuleMatches({}, ad)).toBe(true);
    expect(adRuleMatches(null, ad)).toBe(true);
  });

  test("a listed ad, or one whose headline or link has the words", () => {
    expect(adRuleMatches({ adIds: ["ad-1"] }, ad)).toBe(true);
    expect(adRuleMatches({ adIds: ["ad-2"] }, ad)).toBe(false);
    expect(adRuleMatches({ adMatch: "summer" }, ad)).toBe(true);
    expect(adRuleMatches({ adMatch: "fb.me/abc" }, ad)).toBe(true);
    expect(adRuleMatches({ adIds: ["ad-2"], adMatch: "winter" }, ad)).toBe(false);
    expect(adRuleMatches({ adIds: ["ad-2"], adMatch: "sale" }, ad)).toBe(true);
  });

  test("nothing without an ad", () => {
    expect(adRuleMatches({}, undefined)).toBe(false);
  });

  test("puts rules for particular ads first", () => {
    const rules = [{}, { adMatch: "sale" }, { adIds: [] }, { adIds: ["ad-1"] }];
    const sorted = [...rules].sort((a, b) => adRuleSpecificity(b) - adRuleSpecificity(a));
    expect(sorted.slice(0, 2)).toEqual([{ adMatch: "sale" }, { adIds: ["ad-1"] }]);
  });
});
