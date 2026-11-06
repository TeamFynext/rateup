import { describe, expect, test } from "vitest";

import {
  generateLocalMessageId,
  generateWebchatMessageId,
  isWebchatMessageId,
  WEBCHAT_ID_PREFIX,
} from "./messageId.js";
import { generateInternalMessageId } from "../modules/whatsapp/automatedReply/wa_automatedReply.utils.js";

const WHATSAPP = /^wamid\.[0-9a-z]+-[0-9a-f]{32}$/;
const WEBCHAT = /^wcmid\.[0-9a-z]+-[0-9a-f]{32}$/;

describe("generateLocalMessageId", () => {
  test("takes the shape of a Meta wamid", () => {
    expect(generateLocalMessageId()).toMatch(WHATSAPP);
  });

  test("is unique across a burst", () => {
    // The bug this replaces: webchat ids were a pure function of the visitor's phone number,
    // so a whole thread shared one and the inbox drew it as a single message.
    const ids = new Set(Array.from({ length: 1000 }, () => generateWebchatMessageId()));

    expect(ids.size).toBe(1000);
  });

  test("is what the rule engine's own generator now returns", () => {
    expect(generateInternalMessageId()).toMatch(WHATSAPP);
  });
});

describe("generateWebchatMessageId", () => {
  test("takes the same shape under its own prefix", () => {
    expect(generateWebchatMessageId()).toMatch(WEBCHAT);
  });

  test("never claims to be a WhatsApp id", () => {
    // wamid is Meta's, short for WhatsApp Message ID; a widget message never touched WhatsApp.
    expect(generateWebchatMessageId().startsWith("wamid.")).toBe(false);
    expect(generateWebchatMessageId().startsWith(`${WEBCHAT_ID_PREFIX}.`)).toBe(true);
  });
});

describe("isWebchatMessageId", () => {
  test("recognises an id it minted for the widget", () => {
    expect(isWebchatMessageId(generateWebchatMessageId())).toBe(true);
  });

  test("rejects a locally minted WhatsApp id", () => {
    expect(isWebchatMessageId(generateLocalMessageId())).toBe(false);
    expect(isWebchatMessageId(generateInternalMessageId())).toBe(false);
  });

  test("rejects a real WhatsApp wamid", () => {
    expect(isWebchatMessageId("wamid.HBgMOTE5MDk4NzY1NDMyFQIAERgSNzhBQjEyM0RFRjQ1Njc4OQA=")).toBe(
      false,
    );
  });

  test("rejects nothing at all", () => {
    expect(isWebchatMessageId(null)).toBe(false);
    expect(isWebchatMessageId(undefined)).toBe(false);
    expect(isWebchatMessageId("")).toBe(false);
  });
});
