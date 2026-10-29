import { describe, expect, test } from "vitest";

import { TeamFeature } from "@/types/enums.ts";
import { AutomationPlatform } from "@/types/platform.ts";
import {
  getRequiredFeatureForDashboardPath,
  getWhatsappLandingTarget,
} from "@/utils/dashboard-feature-access.ts";

import { parseChatbotEditorSearch } from "./chatbotEditorSearch.ts";
import { CHANNEL_PARAM_TO_PLATFORM } from "./ChatbotsPage.tsx";
import { needsKeyword } from "./ChatbotStartPanel.tsx";

describe("the Chatbots section", () => {
  test("the list, the editor and the old addresses all need the Chatbots feature", () => {
    for (const path of [
      "/dashboard/chatbots",
      "/dashboard/chatbots/0b6f9c1e-0000-4000-8000-000000000000",
      "/dashboard/whatsapp/flowbots",
      "/dashboard/instagram/flowbots/abc",
    ]) {
      expect(getRequiredFeatureForDashboardPath(path), path).toBe(TeamFeature.Chatbots);
    }
  });

  test("WhatsApp's landing no longer sends anyone to the old chatbot list", () => {
    expect(getWhatsappLandingTarget(new Set([TeamFeature.Chatbots]))).toBe("/dashboard/chatbots");
  });

  test("the URL's messenger is the API's FACEBOOK", () => {
    expect(CHANNEL_PARAM_TO_PLATFORM.messenger).toBe(AutomationPlatform.FACEBOOK);
    expect(CHANNEL_PARAM_TO_PLATFORM.whatsapp).toBe(AutomationPlatform.WHATSAPP);
    expect(CHANNEL_PARAM_TO_PLATFORM.instagram).toBe(AutomationPlatform.INSTAGRAM);
  });

  test("the editor keeps the wizard's start, example and account, and drops anything else", () => {
    expect(
      parseChatbotEditorSearch({
        trigger: "comment",
        example: "ig-comment-to-dm",
        channel: "acc-1",
        waAutomatedReplyId: "x",
      }),
    ).toEqual({ trigger: "comment", example: "ig-comment-to-dm", channel: "acc-1" });
    expect(parseChatbotEditorSearch({ trigger: "carrier-pigeon", example: 3 })).toEqual({
      trigger: undefined,
      example: undefined,
      channel: undefined,
    });
  });
});

describe("the start rule card", () => {
  const rule = {
    id: "rule-1",
    name: "Welcome · start",
    isActive: false,
    triggerEvent: "MESSAGE_RECEIVED",
    accountIds: ["acc-1"],
    keywords: [""],
  };

  test("asks for the keyword the wizard left blank", () => {
    expect(needsKeyword(rule)).toBe(true);
    expect(needsKeyword({ ...rule, keywords: ["  "] })).toBe(true);
  });

  test("leaves a rule with its keyword, or no keyword at all, alone", () => {
    expect(needsKeyword({ ...rule, keywords: ["menu"] })).toBe(false);
    expect(needsKeyword({ ...rule, keywords: ["", "menu"] })).toBe(false);
    expect(needsKeyword({ ...rule, triggerEvent: "INSTAGRAM_COMMENT", keywords: [] })).toBe(false);
  });
});
