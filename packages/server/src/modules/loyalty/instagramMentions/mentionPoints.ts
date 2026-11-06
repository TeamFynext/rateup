import type { InstagramMentionKind } from "../../../generated/prisma/client.js";
import { log } from "../../../utils/logger.js";
import prisma from "../../../utils/prisma.js";
import { announceLoyaltyTransactions } from "../loyalty.webhooks.js";

/**
 * The ledger half of "points for an Instagram mention". `awardPoints` prices a purchase
 * through the earning rules engine; a mention is a flat amount set on its own rule, so it
 * is booked here instead, with the same guarantees: one balance increment and one ledger
 * row in a transaction, made exactly once per idempotency key.
 */

export const INSTAGRAM_MENTION_SOURCE = "instagram_mention";

export function instagramMentionIdempotencyKey(kind: InstagramMentionKind, sourceId: string) {
  return `ig_mention:${kind}:${sourceId}`;
}

const DESCRIPTIONS: Record<InstagramMentionKind, string> = {
  STORY: "Mentioned us in an Instagram story",
  MEDIA: "Mentioned us in an Instagram post",
  COMMENT: "Mentioned us in an Instagram comment",
};

export interface MentionCreditInput {
  programId: string;
  orgId: string;
  accountId: string;
  earningRuleId: string;
  points: number;
  kind: InstagramMentionKind;
  sourceId: string;
  mentionId: string;
  permalink?: string | null;
}

export interface MentionCreditResult {
  /** True when the key had already been booked; nothing was credited this time. */
  replayed: boolean;
  transactionId: string;
  points: number;
  balance: number;
}

function isUniqueViolation(e: unknown): boolean {
  return typeof e === "object" && e !== null && (e as { code?: string }).code === "P2002";
}

export async function creditInstagramMention(
  input: MentionCreditInput,
): Promise<MentionCreditResult> {
  const idempotencyKey = instagramMentionIdempotencyKey(input.kind, input.sourceId);
  const key = { programId_idempotencyKey: { programId: input.programId, idempotencyKey } };

  const already = await prisma.loyaltyTransaction.findUnique({ where: key });
  if (already) {
    return {
      replayed: true,
      transactionId: already.id,
      points: already.points,
      balance: already.balanceAfter,
    };
  }

  let row;
  try {
    row = await prisma.$transaction(async (tx) => {
      const account = await tx.customerLoyaltyAccount.update({
        where: { id: input.accountId },
        data: {
          currentPoints: { increment: input.points },
          lifetimePoints: { increment: input.points },
          lastActivityAt: new Date(),
        },
      });
      return await tx.loyaltyTransaction.create({
        data: {
          accountId: input.accountId,
          programId: input.programId,
          transactionType: "earn",
          source: INSTAGRAM_MENTION_SOURCE,
          points: input.points,
          basePoints: input.points,
          balanceAfter: account.currentPoints,
          earningRuleId: input.earningRuleId,
          referenceId: input.sourceId,
          idempotencyKey,
          description: DESCRIPTIONS[input.kind],
          metadata: {
            mentionId: input.mentionId,
            mentionKind: input.kind,
            sourceId: input.sourceId,
            permalink: input.permalink ?? null,
          },
        },
      });
    });
  } catch (e) {
    if (!isUniqueViolation(e)) throw e;
    // Lost a race with the same mention; the rollback undid our increment.
    const winner = await prisma.loyaltyTransaction.findUnique({ where: key });
    if (!winner) throw e;
    return {
      replayed: true,
      transactionId: winner.id,
      points: winner.points,
      balance: winner.balanceAfter,
    };
  }

  // Usage count is informational for a flat rule; a failure must not undo the award.
  await prisma.loyaltyEarningRule
    .update({
      where: { id: input.earningRuleId },
      data: { currentTotalUses: { increment: 1 } },
    })
    .catch((e: unknown) =>
      log.warn({ err: e, ruleId: input.earningRuleId }, "Could not count a mention award"),
    );

  void announceLoyaltyTransactions(input.orgId, [row]);

  return { replayed: false, transactionId: row.id, points: row.points, balance: row.balanceAfter };
}
