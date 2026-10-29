import { describe, expect, test } from "vitest";

import { AutomationPlatform } from "@/types/platform.ts";
import { isComponentSupportedOnPlatform } from "@/types/platform.ts";

import {
  getNodeFieldErrors,
  getNodeLimitErrors,
  mediaLimit,
  sentLength,
} from "./node-validation.ts";

const { WHATSAPP, INSTAGRAM, FACEBOOK } = AutomationPlatform;
const text = (length: number) => "a".repeat(length);
const richText = (value: string) => ({
  type: "doc",
  content: [{ type: "paragraph", content: [{ type: "text", text: value }] }],
});

describe("sentLength", () => {
  test("counts plain and rich text as sent", () => {
    expect(sentLength("hello")).toBe(5);
    expect(sentLength(richText("hello"))).toBe(5);
    expect(sentLength(JSON.stringify(richText("hello")))).toBe(5);
    expect(sentLength(undefined)).toBe(0);
  });
});

describe("channel limits", () => {
  const textNode = (body: unknown) => ({ type: "textNode", data: { label: "Hi", body } as never });

  test("a text is held to its channel: 4096 / 1000 / 2000", () => {
    const node = textNode(text(1500));
    expect(getNodeLimitErrors(node, WHATSAPP)).toEqual({});
    expect(getNodeLimitErrors(node, INSTAGRAM)).toHaveProperty("body");
    expect(getNodeLimitErrors(node, FACEBOOK)).toEqual({});
    expect(getNodeLimitErrors(textNode(richText(text(2001))), FACEBOOK)).toHaveProperty("body");
  });

  test("quick replies and cards follow Meta's counts", () => {
    const replies = Array.from({ length: 14 }, (_, i) => ({ id: `${i}`, title: "Yes" }));
    expect(
      getNodeLimitErrors(
        {
          type: "instagramQuickReplyNode",
          data: { label: "Q", text: "Pick", quick_replies: replies },
        },
        INSTAGRAM,
      ),
    ).toEqual({ quick_replies: "Up to 13 quick replies." });
    expect(
      getNodeLimitErrors(
        {
          type: "instagramGenericTemplateNode",
          data: {
            label: "C",
            elements: [{ title: "Tee", buttons: Array(4).fill({ title: "Buy" }) }] as never,
          },
        },
        FACEBOOK,
      ),
    ).toEqual({ elements: "Up to 3 buttons per card." });
  });

  test("required fields still win over limits, and no channel means no limits", () => {
    expect(getNodeFieldErrors(textNode(""), INSTAGRAM)).toEqual({
      body: "Message text is required.",
    });
    expect(getNodeFieldErrors(textNode(text(5000)))).toEqual({});
  });

  test("media sizes per channel", () => {
    expect(mediaLimit("imageNode", WHATSAPP)?.text).toBe("5 MB");
    expect(mediaLimit("imageNode", INSTAGRAM)?.text).toBe("8 MB");
    expect(mediaLimit("videoNode", FACEBOOK)?.text).toBe("25 MB");
    expect(mediaLimit("documentNode", INSTAGRAM)).toBeUndefined();
  });
});

describe("block list", () => {
  test("documents are on WhatsApp and Messenger, not Instagram", () => {
    expect(isComponentSupportedOnPlatform("documentNode", WHATSAPP)).toBe(true);
    expect(isComponentSupportedOnPlatform("documentNode", FACEBOOK)).toBe(true);
    expect(isComponentSupportedOnPlatform("documentNode", INSTAGRAM)).toBe(false);
  });

  test("story replies and ice breakers are no longer offered as blocks", () => {
    for (const platform of [WHATSAPP, INSTAGRAM, FACEBOOK]) {
      expect(isComponentSupportedOnPlatform("instagramStoryReplyNode", platform)).toBe(false);
      expect(isComponentSupportedOnPlatform("instagramIceBreakerNode", platform)).toBe(false);
    }
  });
});
