import { LoyaltyEventType } from "../../../types/enums.js";
import { log } from "../../../utils/logger.js";
import prisma from "../../../utils/prisma.js";
import { dispatchLoyaltyNotification } from "../loyaltyWaDispatcher.js";
import { computeQualifyingSpendBatch, pickQualifiedTier } from "./qualifyingSpend.js";

/** Members are read in pages this size so a large programme never loads all at once. */
const PAGE_SIZE = 500;

export interface TierReevaluationSummary {
  programs: number;
  evaluated: number;
  promoted: number;
  demoted: number;
}

/**
 * Nightly sweep for programmes that judge tiers on a trailing window.
 *
 * A member is otherwise only re-checked when they buy (`awardPoints` → `checkAndUpgradeTier`),
 * so someone who stopped visiting would keep VIP forever. This walks every active member of
 * every windowed programme, recomputes their spend inside the window and moves them to the
 * tier they qualify for now.
 *
 * A promotion is announced the same way the till does it (TIER_UPGRADED). A demotion is
 * silent — there is no TIER_DOWNGRADED event type, and a zero-point ledger row would only
 * pollute the customer's history and the dashboard sums — so it is logged for the audit
 * trail instead.
 */
export async function reevaluateRollingTiers(): Promise<TierReevaluationSummary> {
  const summary: TierReevaluationSummary = { programs: 0, evaluated: 0, promoted: 0, demoted: 0 };

  const programs = await prisma.loyaltyProgram.findMany({
    where: { status: "active", tiersEnabled: true, tierQualificationWindowMonths: { not: null } },
    select: {
      id: true,
      orgId: true,
      tierQualificationWindowMonths: true,
      tiers: { orderBy: { threshold: "desc" } },
    },
  });

  for (const program of programs) {
    const windowMonths = program.tierQualificationWindowMonths;
    if (windowMonths === null || program.tiers.length === 0) continue;
    summary.programs += 1;

    const result = await reevaluateProgramTiers({
      id: program.id,
      orgId: program.orgId,
      windowMonths,
      tiers: program.tiers,
    });
    summary.evaluated += result.evaluated;
    summary.promoted += result.promoted;
    summary.demoted += result.demoted;
  }

  log.info(summary, "Loyalty tier re-evaluation finished");
  return summary;
}

export interface ProgramTierMoves {
  evaluated: number;
  promoted: number;
  demoted: number;
}

interface ProgramLadder {
  id: string;
  orgId: string;
  /** Trailing months of purchase spend that count; null = lifetime spend. */
  windowMonths: number | null;
  /** Highest threshold first. */
  tiers: readonly { id: string; name: string; threshold: unknown }[];
}

/**
 * Places every active member of one programme on the tier their spend now earns.
 *
 * Used nightly for windowed programmes, and immediately after the ladder itself changes —
 * a raised threshold or a new tier in the middle moves people, and the merchant who made
 * the change expects to see the result, not wait for the sweep. Lifetime programmes read
 * `totalSpend` straight off the account; windowed ones sum purchases inside the window.
 */
export async function reevaluateProgramTiers(program: ProgramLadder): Promise<ProgramTierMoves> {
  const moves: ProgramTierMoves = { evaluated: 0, promoted: 0, demoted: 0 };
  if (program.tiers.length === 0) return moves;

  let cursor: string | undefined;
  for (;;) {
    const members = await prisma.customerLoyaltyAccount.findMany({
      where: { programId: program.id, status: "active" },
      orderBy: { id: "asc" },
      take: PAGE_SIZE,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: {
        id: true,
        currentTierId: true,
        totalSpend: true,
        contact: { select: { phone: true, name: true } },
      },
    });
    if (members.length === 0) break;

    const spend =
      program.windowMonths === null
        ? new Map(members.map((m) => [m.id, Number(m.totalSpend ?? 0)]))
        : await computeQualifyingSpendBatch(
            program.id,
            members.map((m) => m.id),
            program.windowMonths,
          );

    for (const member of members) {
      moves.evaluated += 1;
      const target = pickQualifiedTier(program.tiers, spend.get(member.id) ?? 0);
      if (!target || target.id === member.currentTierId) continue;

      const from = program.tiers.find((tier) => tier.id === member.currentTierId) ?? null;
      const up = from === null || Number(target.threshold) > Number(from.threshold);

      await prisma.customerLoyaltyAccount.update({
        where: { id: member.id },
        data: { currentTierId: target.id },
      });

      if (up) {
        moves.promoted += 1;
        // An untiered member landing on the base rung is a placement, not news.
        if (Number(target.threshold) > 0 && member.contact?.phone) {
          try {
            await dispatchLoyaltyNotification(program.orgId, LoyaltyEventType.TIER_UPGRADED, {
              customerPhone: member.contact.phone,
              customerName: member.contact.name || "Customer",
              newTier: target.name,
              oldTier: from?.name,
            });
          } catch (error) {
            // One member's message must not stop the sweep for everyone after them.
            log.error(
              { err: error, programId: program.id, accountId: member.id },
              "Tier re-evaluation: promotion notice failed",
            );
          }
        }
      } else {
        moves.demoted += 1;
        log.info(
          {
            programId: program.id,
            accountId: member.id,
            from: from?.name ?? null,
            to: target.name,
            spend: spend.get(member.id) ?? 0,
            windowMonths: program.windowMonths,
          },
          "Loyalty tier demoted by re-evaluation",
        );
      }
    }

    if (members.length < PAGE_SIZE) break;
    cursor = members[members.length - 1]?.id;
  }

  return moves;
}
