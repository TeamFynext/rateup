import { randomInt } from "node:crypto";

import { PlatformType } from "../../../../generated/prisma/enums.js";

/**
 * Handoff codes: the short token a "Continue on WhatsApp" (or Instagram / Messenger) link
 * carries, so the message it opens can be tied back to the contact it was sent to.
 *
 * Pure helpers only — no Redis, no database — so the inbound hook in `handleWaMessages`
 * can look for a token on every message without loading anything.
 *
 * Two carriers, one code:
 * - WhatsApp: the code rides in the prefilled text of a `wa.me` link as `ref:K7P2QM9X`.
 *   It is a delimited, upper-case token of a fixed length from an alphabet without
 *   look-alikes, so ordinary text ("ref: invoice 12") never matches.
 * - Instagram / Messenger: the code rides in the link's `ref` parameter as
 *   `handoff_K7P2QM9X`, which Meta hands back on the referral webhook. The whole `ref` must
 *   be the token; a link rule's ref never is.
 */

/** No 0/O, 1/I/L: the code is read off a screen at worst, typed at worst-worst. */
export const HANDOFF_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export const HANDOFF_CODE_LENGTH = 8;

const CODE_CHARS = `[${HANDOFF_ALPHABET}]{${HANDOFF_CODE_LENGTH}}`;
/** In WhatsApp text: whitespace (or the edges) on both sides, exact case. */
const TEXT_TOKEN = new RegExp(`(^|\\s)ref:(${CODE_CHARS})(?=\\s|$)`);
/** A Meta `ref` parameter that is exactly a handoff token. */
const REF_TOKEN = new RegExp(`^handoff_(${CODE_CHARS})$`);

export function newHandoffCode(): string {
  return Array.from(
    { length: HANDOFF_CODE_LENGTH },
    () => HANDOFF_ALPHABET[randomInt(HANDOFF_ALPHABET.length)],
  ).join("");
}

export function isHandoffCode(value: string): boolean {
  return new RegExp(`^${CODE_CHARS}$`).test(value);
}

/** The token as it is written into a wa.me prefill. */
export function textToken(code: string): string {
  return `ref:${code}`;
}

/** The token as it is written into an ig.me / m.me `ref`. */
export function refToken(code: string): string {
  return `handoff_${code}`;
}

/** The code in a WhatsApp message's text, or null. */
export function readTextCode(text: string | null | undefined): string | null {
  if (!text) return null;
  return TEXT_TOKEN.exec(text)?.[2] ?? null;
}

/** The code in an Instagram / Messenger `ref`, or null. */
export function readRefCode(ref: string | null | undefined): string | null {
  if (!ref) return null;
  return REF_TOKEN.exec(ref.trim())?.[1] ?? null;
}

/**
 * The text with the token taken out, tidied so the customer's own words read as typed
 * ("Hi! I'd like to continue here ref:K7P2QM9X" → "Hi! I'd like to continue here").
 */
export function stripTextToken(text: string, code: string): string {
  return text
    .replace(new RegExp(`(^|\\s)${textToken(code)}(?=\\s|$)`), "$1")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

type Body = Record<string, unknown> | null | undefined;

function asRecord(value: unknown): Body {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

/** The WhatsApp text body of a stored inbound message (`{ receive: { messages: [...] } }`). */
export function whatsappText(receive: unknown): string | null {
  const messages = asRecord(receive)?.messages;
  const first = Array.isArray(messages) ? asRecord(messages[0]) : undefined;
  if (first?.type !== "text") return null;
  const body = asRecord(first.text)?.body;
  return typeof body === "string" ? body : null;
}

/**
 * The `ref` of an Instagram / Messenger inbound event, wherever Meta put it: on the event
 * (an existing thread reopened from a link), on the first message, or on the Get Started /
 * ice-breaker postback. Stored payloads keep Meta's shape, so the same three places.
 */
export function metaReferralRef(receive: unknown): string | null {
  const body = asRecord(receive);
  const candidates = [
    asRecord(body?.referral),
    asRecord(asRecord(body?.message)?.referral),
    asRecord(asRecord(body?.postback)?.referral),
  ];
  for (const referral of candidates) {
    if (typeof referral?.ref === "string") return referral.ref;
  }
  return null;
}

/** The handoff code an inbound message carries on its platform, if any. */
export function findHandoffCode(platform: PlatformType, receive: unknown): string | null {
  switch (platform) {
    case PlatformType.WHATSAPP:
      return readTextCode(whatsappText(receive));
    case PlatformType.INSTAGRAM:
    case PlatformType.FACEBOOK:
      return readRefCode(metaReferralRef(receive));
    default:
      return null;
  }
}
