import type { PlatformType } from "../../../../generated/prisma/client.js";
import prisma from "../../../utils/prisma.js";
import { log } from "../../../utils/logger.js";
import { incrementMeteredConversationCount } from "../../stats/stats.service.js";

/**
 * A metered conversation window is a fixed 24 hours from its first message.
 *
 * Deliberately fixed rather than rolling. A rolling window that resets on every
 * customer message matches Meta's *service* window, but it never closes while a
 * customer keeps chatting — which is the exact "conversations never close" problem
 * this table exists to escape. A fixed box always terminates, so the meter is
 * bounded and predictable.
 */
export const WINDOW_DURATION_MS = 24 * 60 * 60 * 1000;

export interface RecordMessageInWindowInput {
  orgId: string;
  platform: PlatformType;
  /**
   * Business-side channel identity (`sourceIdentifier`). Callers pass whatever they
   * have; it is coalesced to "" and put through `normalizeChannelId` before it is
   * used as part of the window key.
   */
  channelId: string | null | undefined;
  /** Customer-side identity — wa_id / igsId / psid, i.e. `from`. */
  customerId: string;
  contactId?: string;
  at: Date;
  direction: "send" | "receive";
}

export interface RecordMessageInWindowResult {
  conversationId: string;
  /** True only when this message opened a new window — the one moment usage ticks. */
  opened: boolean;
}

/**
 * Attributes one message to its 24h metered window, opening a window if none is
 * currently open, and increments the org's usage counter **only** when a window was
 * actually opened.
 *
 * The find-or-open is a single INSERT ... WHERE NOT EXISTS rather than a read
 * followed by a write. A customer firing three messages within the same second
 * produces three concurrent handlers; a read-then-write would let all three observe
 * "no open window" and open three, inflating the meter threefold on the most common
 * real-world burst. Postgres evaluates the NOT EXISTS and the insert atomically, and
 * the unique constraint catches the residual race, so at most one wins.
 *
 * Best-effort by design: metering must never cost a customer their message. On
 * failure this logs and returns null, and the caller writes the message unattributed.
 */
/**
 * Collapses a channel identity to one canonical string.
 *
 * A WhatsApp channel is a phone number, and the same number reaches this function
 * in at least three shapes depending on which path got here: the webhook's
 * `metadata.display_phone_number` ("15551323034"), `WhatsappSettings.phone` as
 * stored from the Graph API, which only had its spaces squeezed out
 * ("+1555-132-3034"), and that same value with the plus stripped
 * ("1555-132-3034", see `metaChannels.ts`).
 *
 * `channelId` is part of both the open-window probe and the unique constraint, so
 * an unnormalized value does not merely look untidy — it opens a *second* window
 * for a conversation that already has one, and every extra window is a counted
 * conversation against the org's allowance. Digits are the one form every path
 * agrees on.
 *
 * Only WhatsApp is rewritten. Instagram and Facebook channel ids are opaque
 * numeric ids that happen to be digits already, and webchat's is not a phone
 * number at all; none of them arrive in competing formats, so none are touched.
 */
export function normalizeChannelId(platform: PlatformType, channelId: string): string {
  if (platform !== "WHATSAPP") return channelId;
  const digits = channelId.replace(/\D/g, "");
  // A WhatsApp channel id with no digits in it is not something this can improve
  // on — keep it as-is rather than collapsing every such value to "".
  return digits || channelId;
}

export async function recordMessageInWindow(
  input: RecordMessageInWindowInput,
): Promise<RecordMessageInWindowResult | null> {
  const { orgId, platform, customerId, contactId, at, direction } = input;
  // Coalesced to "" because Postgres treats NULLs as distinct in a unique
  // constraint, which would silently defeat the dedupe.
  const channelId = normalizeChannelId(platform, input.channelId ?? "");
  const inbound = direction === "receive";

  try {
    const expiresAt = new Date(at.getTime() + WINDOW_DURATION_MS);

    // Opens a window only when no unexpired one exists for this identity. The
    // ON CONFLICT covers the narrow race where two transactions pass the NOT EXISTS
    // check simultaneously with an identical `openedAt`.
    const inserted = await prisma.$queryRaw<Array<{ id: string }>>`
      INSERT INTO "MeteredConversation" (
        "orgId", "platform", "channelId", "customerId", "contactId",
        "openedAt", "expiresAt", "lastMessageAt",
        "messageCount", "inboundCount", "outboundCount"
      )
      SELECT
        ${orgId}::uuid, ${platform}::"PlatformType", ${channelId}, ${customerId},
        ${contactId ?? null}::uuid, ${at}, ${expiresAt}, ${at},
        1, ${inbound ? 1 : 0}, ${inbound ? 0 : 1}
      WHERE NOT EXISTS (
        SELECT 1 FROM "MeteredConversation"
        WHERE "orgId" = ${orgId}::uuid
          AND "platform" = ${platform}::"PlatformType"
          AND "channelId" = ${channelId}
          AND "customerId" = ${customerId}
          AND "expiresAt" > ${at}
      )
      ON CONFLICT DO NOTHING
      RETURNING "id"
    `;

    if (inserted.length > 0) {
      const conversationId = inserted[0].id;
      // The single moment usage ticks. Status webhooks for this same message fire
      // repeatedly (sent -> delivered -> read) and every one of them re-enters the
      // window as an existing row, so gating on "did we insert" is what makes the
      // meter idempotent.
      await incrementMeteredConversationCount(orgId);
      return { conversationId, opened: true };
    }

    // A window was already open: fold this message into it. GREATEST guards against
    // out-of-order delivery pushing lastMessageAt backwards.
    const updated = await prisma.$queryRaw<Array<{ id: string }>>`
      UPDATE "MeteredConversation"
      SET "messageCount" = "messageCount" + 1,
          "inboundCount" = "inboundCount" + ${inbound ? 1 : 0},
          "outboundCount" = "outboundCount" + ${inbound ? 0 : 1},
          "lastMessageAt" = GREATEST("lastMessageAt", ${at}),
          "contactId" = COALESCE("contactId", ${contactId ?? null}::uuid)
      WHERE "id" = (
        SELECT "id" FROM "MeteredConversation"
        WHERE "orgId" = ${orgId}::uuid
          AND "platform" = ${platform}::"PlatformType"
          AND "channelId" = ${channelId}
          AND "customerId" = ${customerId}
          AND "expiresAt" > ${at}
        ORDER BY "openedAt" DESC
        LIMIT 1
      )
      RETURNING "id"
    `;

    if (updated.length > 0) return { conversationId: updated[0].id, opened: false };

    // Neither branch matched: the window expired between the insert probe and the
    // update (a message landing within milliseconds of the 24h boundary). Rare and
    // self-correcting — the next message opens a fresh window.
    log.warn(
      { orgId, platform, channelId, customerId },
      "Metered conversation window vanished between insert and update",
    );
    return null;
  } catch (error) {
    log.error(error, "Failed to record message in metered conversation window");
    return null;
  }
}
