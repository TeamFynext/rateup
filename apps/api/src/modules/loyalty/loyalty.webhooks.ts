import prisma from "../../utils/prisma.js";
import { log } from "../../utils/logger.js";
import { emitWebhookEvents } from "../settings/webhooks/webhook.events.js";
import type { EnvelopeWebhookEventName } from "../settings/webhooks/webhook.schema.js";
import { contactFields, primaryIdentities } from "../contacts/identity/contactFields.js";

/**
 * `loyalty.points.*` webhook events, one per ledger row.
 *
 * Called by each ledger writer *after* its transaction has committed — never from
 * inside a `$transaction` callback, where a rollback after the enqueue would
 * announce points that never existed. Fire-and-forget: nothing here can fail the
 * write that produced the rows.
 *
 * Covered: purchase awards, signup and referral bonuses, redemptions (direct and
 * approved), approved adjustments and purchase reversals. Not covered: the expiry
 * sweep and the programme reset, which write in bulk with `createMany`.
 */

/** The ledger columns the event reads. */
export interface LoyaltyLedgerRow {
  id: string;
  accountId: string;
  programId: string;
  transactionType: string;
  source: string;
  points: number;
  balanceAfter: number;
  description?: string | null;
  referenceId?: string | null;
  idempotencyKey?: string | null;
  createdAt: Date;
}

export interface LoyaltyMemberRef {
  phone: string | null;
  cardCode: string | null;
}

/** Which event a ledger row is. Anything that is neither an earn nor a redeem is an adjustment. */
export function loyaltyWebhookEventType(transactionType: string): EnvelopeWebhookEventName {
  switch (transactionType) {
    case "earn":
      return "loyalty.points.earned";
    case "redeem":
      return "loyalty.points.redeemed";
    default:
      return "loyalty.points.adjusted";
  }
}

export function loyaltyPointsData(row: LoyaltyLedgerRow, member: LoyaltyMemberRef | undefined) {
  return {
    transactionId: row.id,
    member: { phone: member?.phone ?? null, cardCode: member?.cardCode ?? null },
    points: row.points,
    balanceAfter: row.balanceAfter,
    type: row.transactionType,
    source: row.source,
    reason: row.description ?? null,
    referenceId: row.referenceId ?? null,
    idempotencyKey: row.idempotencyKey ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

async function loadMembers(accountIds: string[]): Promise<Map<string, LoyaltyMemberRef>> {
  const accounts = await prisma.customerLoyaltyAccount.findMany({
    where: { id: { in: accountIds } },
    select: { id: true, cardCode: true, contact: { select: primaryIdentities } },
  });
  return new Map(
    accounts.map((a) => [
      a.id,
      { phone: contactFields(a.contact.identities).phone, cardCode: a.cardCode },
    ]),
  );
}

/**
 * Queues the events for committed ledger rows. `member`, when the caller already
 * holds it, saves a lookup; otherwise the members are read — only when the org
 * subscribes to one of the events. A row that moved no points (a redemption
 * held for approval) is not announced.
 */
export async function announceLoyaltyTransactions(
  orgId: string | null | undefined,
  rows: readonly (LoyaltyLedgerRow | null | undefined)[],
  member?: LoyaltyMemberRef,
): Promise<number> {
  try {
    const moved = rows.filter((r): r is LoyaltyLedgerRow => !!r && r.points !== 0);
    if (!moved.length) return 0;

    const org =
      orgId ??
      (
        await prisma.loyaltyProgram.findUnique({
          where: { id: moved[0]!.programId },
          select: { orgId: true },
        })
      )?.orgId;
    if (!org) return 0;

    let members: Promise<Map<string, LoyaltyMemberRef>> | undefined;
    const memberFor = async (accountId: string) => {
      if (member) return member;
      members ??= loadMembers([...new Set(moved.map((r) => r.accountId))]);
      return (await members).get(accountId);
    };

    return await emitWebhookEvents(
      moved.map((row) => ({
        orgId: org,
        type: loyaltyWebhookEventType(row.transactionType),
        data: async () => loyaltyPointsData(row, await memberFor(row.accountId)),
        createdAt: row.createdAt,
      })),
    );
  } catch (err) {
    log.error({ err, orgId }, "Could not announce loyalty transactions");
    return 0;
  }
}
