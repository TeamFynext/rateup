import { describe, expect, test, vi } from "vite-plus/test";

vi.mock("../../../utils/prisma.js", () => ({ default: {} }));

import { storyReplyRuleMatches } from "./rules.utils.js";

describe("storyReplyRuleMatches", () => {
  test("answers any reply to any story by default", () => {
    expect(storyReplyRuleMatches({}, "story-1", "love this")).toBe(true);
    expect(storyReplyRuleMatches(null, "story-1", "")).toBe(true);
  });

  test("answers only the listed stories when narrowed", () => {
    const options = { instagramStoryScope: "SPECIFIC", instagramStoryIds: ["story-1"] };
    expect(storyReplyRuleMatches(options, "story-1", "hi")).toBe(true);
    expect(storyReplyRuleMatches(options, "story-2", "hi")).toBe(false);
    expect(storyReplyRuleMatches(options, undefined, "hi")).toBe(false);
  });

  test("a narrowed rule with no stories picked answers nothing", () => {
    expect(storyReplyRuleMatches({ instagramStoryScope: "SPECIFIC" }, "story-1", "hi")).toBe(false);
  });

  test("matches keywords as whole words, ignoring case", () => {
    const options = { instagramStoryKeywords: ["guide"] };
    expect(storyReplyRuleMatches(options, "s", "GUIDE please")).toBe(true);
    expect(storyReplyRuleMatches(options, "s", "I was guided here")).toBe(false);
    expect(storyReplyRuleMatches(options, "s", "")).toBe(false);
  });

  test("matches a multi-word keyword as a phrase", () => {
    const options = { instagramStoryKeywords: ["price list"] };
    expect(storyReplyRuleMatches(options, "s", "send the Price List")).toBe(true);
    expect(storyReplyRuleMatches(options, "s", "price of the list")).toBe(false);
  });

  test("treats blank keywords as none", () => {
    expect(storyReplyRuleMatches({ instagramStoryKeywords: ["  "] }, "s", "anything")).toBe(true);
  });
});
