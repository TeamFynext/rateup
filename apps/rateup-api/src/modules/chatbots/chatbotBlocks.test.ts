import { describe, expect, test } from "vitest";
import { unsupportedBlocks } from "./chatbotBlocks.js";
import { chatbotPlatformSchema } from "./chatbots.schema.js";

const graph = (...types: Array<string | undefined>) => ({ nodes: types.map((type) => ({ type })) });

describe("unsupportedBlocks", () => {
  test("blocks every channel shares pass everywhere", () => {
    const g = graph("startNode", "textNode", "imageNode", "textInputNode", "assignNode");
    for (const p of ["WHATSAPP", "INSTAGRAM", "FACEBOOK"] as const) {
      expect(unsupportedBlocks(g, p)).toEqual([]);
    }
  });

  test("WhatsApp-only blocks are refused on Instagram and Messenger", () => {
    const g = graph("startNode", "buttonNode", "listNode", "buttonNode");
    expect(unsupportedBlocks(g, "WHATSAPP")).toEqual([]);
    expect(unsupportedBlocks(g, "INSTAGRAM")).toEqual(["buttonNode", "listNode"]);
    expect(unsupportedBlocks(g, "FACEBOOK")).toEqual(["buttonNode", "listNode"]);
  });

  test("quick replies and cards work on both Meta channels but not WhatsApp", () => {
    const g = graph("instagramQuickReplyNode", "instagramGenericTemplateNode");
    expect(unsupportedBlocks(g, "INSTAGRAM")).toEqual([]);
    expect(unsupportedBlocks(g, "FACEBOOK")).toEqual([]);
    expect(unsupportedBlocks(g, "WHATSAPP")).toEqual([
      "instagramQuickReplyNode",
      "instagramGenericTemplateNode",
    ]);
  });

  test("Instagram-only blocks are refused on Messenger", () => {
    const g = graph("instagramFollowCheckNode", "instagramProductTemplateNode");
    expect(unsupportedBlocks(g, "INSTAGRAM")).toEqual([]);
    expect(unsupportedBlocks(g, "FACEBOOK")).toEqual([
      "instagramFollowCheckNode",
      "instagramProductTemplateNode",
    ]);
  });

  test("documents work on WhatsApp and Messenger, not Instagram", () => {
    const g = graph("documentNode");
    expect(unsupportedBlocks(g, "WHATSAPP")).toEqual([]);
    expect(unsupportedBlocks(g, "FACEBOOK")).toEqual([]);
    expect(unsupportedBlocks(g, "INSTAGRAM")).toEqual(["documentNode"]);
  });

  test("older Instagram-only nodes still save on Instagram only", () => {
    const g = graph("instagramStoryReplyNode", "instagramIceBreakerNode");
    expect(unsupportedBlocks(g, "INSTAGRAM")).toEqual([]);
    expect(unsupportedBlocks(g, "WHATSAPP")).toEqual([
      "instagramStoryReplyNode",
      "instagramIceBreakerNode",
    ]);
  });

  test("unknown or missing node types are let through", () => {
    expect(unsupportedBlocks(graph("conditionalNode", undefined), "FACEBOOK")).toEqual([]);
    expect(unsupportedBlocks(undefined, "WHATSAPP")).toEqual([]);
  });
});

describe("chatbotPlatformSchema", () => {
  test.each([
    ["WHATSAPP", "WHATSAPP"],
    ["whatsapp", "WHATSAPP"],
    ["instagram", "INSTAGRAM"],
    ["facebook", "FACEBOOK"],
    ["messenger", "FACEBOOK"],
    [" Messenger ", "FACEBOOK"],
  ])("reads %j as %s", (input, expected) => {
    expect(chatbotPlatformSchema.parse(input)).toBe(expected);
  });

  test.each(["WEBCHAT", "INTERNAL", "", 3])("refuses %j", (input) => {
    expect(chatbotPlatformSchema.safeParse(input).success).toBe(false);
  });
});
