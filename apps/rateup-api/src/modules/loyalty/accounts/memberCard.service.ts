import QRCode from "qrcode";

import { PlatformType } from "../../../../generated/prisma/client.js";
import { log } from "../../../utils/logger.js";
import { randomCode } from "../../../utils/misc/random.utils.js";
import prisma from "../../../utils/prisma.js";
import { sendMessage } from "../../whatsapp/whatsappSurvey/wasurvey.service.js";
import { createReplyImageMessage } from "../../whatsapp/whatsappSurvey/wasurvey.utils.js";
import { apiBaseUrl } from "../feedback/feedback.redirect.js";
import { isCustomerSessionOpen } from "../loyaltyMessaging.js";
import { renderReplyText } from "../richText.js";
import { parsePhoneforWa } from "../util.js";
import { CARD_CODE_LENGTH, formatCardCode } from "./cardCode.js";

/**
 * The member card: a QR the customer keeps in their WhatsApp chat and shows at the
 * counter, where the cashier scans it in the RateUp app instead of searching by name or
 * number.
 *
 * The card is an ordinary image message. WhatsApp only delivers freeform media inside the
 * customer's 24-hour service window, so the send is attempted at the moments that window
 * is known to be open — the join, a new member's first message, the `card` keyword — and
 * a staff-initiated send says `session_closed` rather than pretending. Meta fetches the
 * PNG once from the public card endpoint and re-hosts it, so the customer keeps the image
 * whatever happens to our URL; nothing is stored on our side but the code.
 *
 * This module is imported by the account and settings services, so it must not import
 * either of them.
 */

export const CARD_IMAGE_PUBLIC_PATH = "/api/public/loyalty/cards";

/** WhatsApp refuses an image caption longer than this. */
const CAPTION_MAX_CHARS = 1024;
const MINT_ATTEMPTS = 5;

export interface MemberCardSendResult {
  sent: boolean;
  skippedReason: "not_active" | "session_closed" | "no_public_url" | "send_failed" | null;
  cardCode: string | null;
  cardSentAt: Date | null;
}

function isUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "P2002";
}

/**
 * The account's card code, minting one when it has none.
 *
 * The conditional update means two concurrent callers cannot both win: the loser sees no
 * row updated and reads back what the winner wrote. A collision on the unique index is
 * vanishingly rare at 32^12 but costs nothing to retry.
 */
export async function ensureMemberCard(accountId: string): Promise<string> {
  const current = await prisma.customerLoyaltyAccount.findUnique({
    where: { id: accountId },
    select: { cardCode: true },
  });
  if (!current) throw new Error("Customer account not found");
  if (current.cardCode) return current.cardCode;

  for (let attempt = 0; attempt < MINT_ATTEMPTS; attempt++) {
    const cardCode = randomCode(CARD_CODE_LENGTH);
    try {
      const claimed = await prisma.customerLoyaltyAccount.updateMany({
        where: { id: accountId, cardCode: null },
        data: { cardCode },
      });
      if (claimed.count > 0) return cardCode;
      const winner = await prisma.customerLoyaltyAccount.findUnique({
        where: { id: accountId },
        select: { cardCode: true },
      });
      if (winner?.cardCode) return winner.cardCode;
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;
    }
  }
  throw new Error("Could not mint a unique card code");
}

/** The card as a PNG. Error level M survives a scuffed screen; the margin is the quiet zone. */
export async function renderCardPng(code: string): Promise<Buffer> {
  return await QRCode.toBuffer(code, {
    type: "png",
    errorCorrectionLevel: "M",
    width: 768,
    margin: 2,
  });
}

/**
 * Where Meta fetches the image from. Null when the API has no public HTTPS origin
 * configured — Meta refuses plain-http and private links, so local development needs a
 * tunnel before a card can actually be sent.
 */
export function cardImageUrl(code: string): string | null {
  try {
    const base = apiBaseUrl();
    if (!/^https:\/\//i.test(base)) return null;
    return `${base}${CARD_IMAGE_PUBLIC_PATH}/${code}.png`;
  } catch {
    return null;
  }
}

export function defaultCardCaption(input: {
  name: string | null | undefined;
  programName: string | null | undefined;
  pointsName: string | null | undefined;
  code: string;
}): string {
  const greeting = input.name?.trim() ? `Hi ${input.name.trim()}, ` : "";
  const programme = input.programName?.trim() || "our loyalty programme";
  const points = input.pointsName?.trim() || "points";
  return (
    `${greeting}here is your ${programme} card. ` +
    `Show this QR at the counter to collect and use your ${points} — no need to give your number.\n\n` +
    `Card code: ${formatCardCode(input.code)}`
  );
}

function clampCaption(caption: string): string {
  const trimmed = caption.trim();
  return trimmed.length <= CAPTION_MAX_CHARS
    ? trimmed
    : `${trimmed.slice(0, CAPTION_MAX_CHARS - 1)}…`;
}

/** Whether `sendMessage` accepted the send — it reports a Graph failure, it does not throw. */
function acceptedBy(result: unknown): boolean {
  return !(
    result !== undefined &&
    result !== null &&
    typeof result === "object" &&
    "status" in result &&
    (result as { status?: unknown }).status === false
  );
}

/**
 * Sends the member their card, when WhatsApp will take it.
 *
 * `caption` is the merchant's own `card` reply text when they wrote one (already rendered);
 * otherwise the stock caption. Every skip is reported, never thrown, so the callers that
 * run inside enrolment or a webhook can log and move on.
 */
export async function sendMemberCard(input: {
  orgId: string;
  accountId: string;
  caption?: string | null;
}): Promise<MemberCardSendResult> {
  const account = await prisma.customerLoyaltyAccount.findFirst({
    where: { id: input.accountId, program: { orgId: input.orgId } },
    include: {
      contact: { select: { name: true, phone: true } },
      program: { select: { name: true, currencyName: true, status: true } },
    },
  });
  const skipped = (
    reason: MemberCardSendResult["skippedReason"],
    code: string | null = account?.cardCode ?? null,
  ): MemberCardSendResult => ({
    sent: false,
    skippedReason: reason,
    cardCode: code,
    cardSentAt: account?.cardSentAt ?? null,
  });

  if (!account || account.status !== "active" || account.program.status !== "active") {
    return skipped("not_active");
  }
  const phone = account.contact.phone;
  if (!phone) return skipped("not_active");

  if (!(await isCustomerSessionOpen({ orgId: input.orgId, phone }))) {
    return skipped("session_closed");
  }

  const cardCode = await ensureMemberCard(account.id);
  const url = cardImageUrl(cardCode);
  if (!url) {
    log.warn({ accountId: account.id }, "[MemberCard] API_URL is not a public https origin");
    return skipped("no_public_url", cardCode);
  }

  const caption = clampCaption(
    input.caption?.trim() ||
      defaultCardCaption({
        name: account.contact.name,
        programName: account.program.name,
        pointsName: account.program.currencyName,
        code: cardCode,
      }),
  );

  // Same argument shape as `sendTextMessage`: an automated send, conversation limit kept on.
  const result = await sendMessage(
    input.orgId,
    createReplyImageMessage(phone, url, PlatformType.WHATSAPP, caption),
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    "AUTOMATED",
    true,
    false,
    false,
  );
  if (!acceptedBy(result)) {
    log.warn({ accountId: account.id }, "[MemberCard] WhatsApp did not accept the card image");
    return skipped("send_failed", cardCode);
  }

  const cardSentAt = new Date();
  await prisma.customerLoyaltyAccount.update({
    where: { id: account.id },
    data: { cardSentAt },
  });
  return { sent: true, skippedReason: null, cardCode, cardSentAt };
}

/**
 * The merchant's `card` reply rendered for this member, or null when they have not written
 * one. `{{1}}` is the member's name, `{{2}}` the grouped code.
 */
export function renderCardReply(
  content: unknown,
  member: { name: string | null | undefined; cardCode: string },
): string | null {
  if (content === null || content === undefined) return null;
  const text = renderReplyText(content as Parameters<typeof renderReplyText>[0], [
    member.name?.trim() || "",
    formatCardCode(member.cardCode),
  ]).trim();
  return text.length > 0 ? text : null;
}

/**
 * The inbound-message hook: a member who has a code but has never received their card
 * gets it now, while their window is open. New members are minted a code at enrolment;
 * members from before cards existed have none until a `card` keyword or a staff send
 * mints one — so this deliberately does not reach them.
 */
export async function sendMemberCardIfDue(phone: string, orgId: string): Promise<boolean> {
  const due = await prisma.customerLoyaltyAccount.findFirst({
    where: {
      contact: { phone: parsePhoneforWa(phone), orgId },
      status: "active",
      cardCode: { not: null },
      cardSentAt: null,
      program: { status: "active" },
    },
    select: { id: true },
  });
  if (!due) return false;
  const outcome = await sendMemberCard({ orgId, accountId: due.id });
  return outcome.sent;
}

/**
 * Whether a public request for this code should be answered with an image: only codes
 * that belong to an active member of an active programme, so the endpoint never renders
 * arbitrary strings.
 */
export async function cardCodeIsServable(cardCode: string): Promise<boolean> {
  const row = await prisma.customerLoyaltyAccount.findFirst({
    where: { cardCode, status: "active", program: { status: "active" } },
    select: { id: true },
  });
  return row !== null;
}
