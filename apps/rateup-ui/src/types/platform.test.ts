import { describe, expect, test } from "vitest";

import {
  AutomationPlatform,
  automationPlatformOf,
  isComponentSupportedOnPlatform,
} from "./platform.ts";

const { WHATSAPP, INSTAGRAM, FACEBOOK } = AutomationPlatform;

describe("isComponentSupportedOnPlatform", () => {
  test.each([
    "textNode",
    "imageNode",
    "videoNode",
    "audioNode",
    "pauseNode",
    "assignNode",
    "textInputNode",
  ])("%s works everywhere", (node) => {
    for (const platform of [WHATSAPP, INSTAGRAM, FACEBOOK]) {
      expect(isComponentSupportedOnPlatform(node, platform)).toBe(true);
    }
  });

  // Instagram and Messenger share the Send API's quick replies and generic template.
  test.each(["instagramQuickReplyNode", "instagramGenericTemplateNode"])(
    "%s works on Instagram and Messenger, not WhatsApp",
    (node) => {
      expect(isComponentSupportedOnPlatform(node, INSTAGRAM)).toBe(true);
      expect(isComponentSupportedOnPlatform(node, FACEBOOK)).toBe(true);
      expect(isComponentSupportedOnPlatform(node, WHATSAPP)).toBe(false);
    },
  );

  // The engine skips these on Messenger: they lean on Instagram-only APIs.
  test.each(["instagramProductTemplateNode", "instagramFollowCheckNode"])(
    "%s is Instagram only",
    (node) => {
      expect(isComponentSupportedOnPlatform(node, INSTAGRAM)).toBe(true);
      expect(isComponentSupportedOnPlatform(node, FACEBOOK)).toBe(false);
      expect(isComponentSupportedOnPlatform(node, WHATSAPP)).toBe(false);
    },
  );

  test("documents go out on WhatsApp and, as a file, on Messenger", () => {
    expect(isComponentSupportedOnPlatform("documentNode", WHATSAPP)).toBe(true);
    expect(isComponentSupportedOnPlatform("documentNode", FACEBOOK)).toBe(true);
    expect(isComponentSupportedOnPlatform("documentNode", INSTAGRAM)).toBe(false);
  });

  test.each(["buttonNode", "listNode", "ctaUrlNode", "templateNode", "flowNode"])(
    "%s is WhatsApp only",
    (node) => {
      expect(isComponentSupportedOnPlatform(node, WHATSAPP)).toBe(true);
      expect(isComponentSupportedOnPlatform(node, INSTAGRAM)).toBe(false);
      expect(isComponentSupportedOnPlatform(node, FACEBOOK)).toBe(false);
    },
  );

  test("an unknown node is supported nowhere", () => {
    expect(isComponentSupportedOnPlatform("madeUpNode", WHATSAPP)).toBe(false);
  });
});

describe("automationPlatformOf", () => {
  // The API returns the platform as stored, in capitals; forms hold the lowercase enum value.
  test.each([
    ["FACEBOOK", FACEBOOK],
    ["facebook", FACEBOOK],
    ["INSTAGRAM", INSTAGRAM],
    ["instagram", INSTAGRAM],
    ["WHATSAPP", WHATSAPP],
    ["whatsapp", WHATSAPP],
  ])("%s is %s", (value, platform) => {
    expect(automationPlatformOf(value)).toBe(platform);
  });

  test.each([undefined, null, "", "telegram"])(
    "%s falls back to WhatsApp, as in the API",
    (value) => {
      expect(automationPlatformOf(value)).toBe(WHATSAPP);
    },
  );
});
