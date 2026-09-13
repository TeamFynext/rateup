import dayjs from "dayjs";

import { LoyaltyEventType } from "../../../types/enums.js";
import { log } from "../../../utils/logger.js";
import prisma from "../../../utils/prisma.js";
import { assignRewardToCustomer } from "../accounts/account.service.js";
import { sendLoyaltyMessage } from "../loyaltyMessaging.js";
import { isDueThisHour, leadDaysFor, localDay, targetDay } from "./reminderSchedule.js";

/**
 * The three occasions this branch adds: a member about to lose their tier, a redemption
 * code about to lapse, and the anniversary of joining.
 *
 * All three follow the shape the birthday and inactivity sweeps already use — find the
 * audience for one programme, claim each member with a conditional UPDATE, then send
 * through `sendLoyaltyMessage` so an open 24-hour window gets free text instead of a
 * template. Each takes the sweep's clock so one tick reads one instant.
 */

/** A programme as the sweep loads it. */
export interface ReminderProgram {
  id: string;
  name: string;
  orgId: string;
  timezone: string | null;
  whatsappNotifications: boolean;
  sendTextInSession: boolean;
  tierQualificationWindowMonths: number | null;
}

/** A trigger as the sweep loads it. */
export interface ReminderTrigger {
  waTemplateId: string | null;
  rewardId: string | null;
  leadDays: number | null;
  sendHour: number | null;
}

async function issueRewardQuietly(accountId: string, rewardId: string): Promise<void> {
  try {
    const assignment = await assignRewardToCustomer(accountId, rewardId);
    log.info({ accountId, rewardId, code: assignment.shortCode }, "Reminder issued a reward");
  } catch (error) {
    // A gift that cannot be issued must not stop the greeting going out.
    log.error({ err: error, accountId, rewardId }, "Reminder could not issue its reward");
  }
}

/**
 * "Your VIP status ends soon."
 *
 * A programme that judges tiers on a trailing window only re-checks a member when they
 * buy, so without this the first they hear of losing VIP is losing it. The audience is
 * members above the base tier whose spend inside the window no longer covers their tier's
 * threshold, warned `leadDays` before the window closes on them.
 */
export async function checkTierAtRiskAlerts(
  program: ReminderProgram,
  trigger: ReminderTrigger,
  now: Date = new Date(),
): Promise<number> {
  if (!isDueThisHour(program, trigger, now)) return 0;
  if (!program.tierQualificationWindowMonths) return 0;
  if (!trigger.waTemplateId) return 0;

  const leadDays = leadDaysFor(LoyaltyEventType.TIER_AT_RISK, trigger.leadDays);
  const windowStart = dayjs(now).subtract(program.tierQualificationWindowMonths, "month").toDate();
  const { startOfDay } = localDay(program, now);

  // Spend inside the window, per member, against the tier they currently hold. Members on
  // the base tier (threshold 0) have nothing to lose, so they are excluded by the join.
  const atRisk = await prisma.$queryRaw<
    { accountId: string; shortfall: string; tierName: string }[]
  >`
    SELECT a.id                                  AS "accountId",
           (t.threshold - COALESCE(SUM(x."purchaseAmount"), 0))::text AS shortfall,
           t.name                                AS "tierName"
    FROM "CustomerLoyaltyAccount" a
    JOIN "LoyaltyTier" t ON t.id = a."currentTierId"
    LEFT JOIN "LoyaltyTransaction" x
           ON x."accountId" = a.id
          -- Same predicate as computeQualifyingSpend: rows carrying a purchase amount, so
          -- a reversal's negative row is subtracted. Filtering on earn rows would warn
          -- members about a shortfall computed from money already refunded to them.
          AND x."purchaseAmount" IS NOT NULL
          AND x."createdAt" >= ${windowStart}
    WHERE a."programId" = ${program.id}::uuid
      AND a.status = 'active'
      AND t.threshold > 0
      AND (a."lastTierAtRiskAlertAt" IS NULL OR a."lastTierAtRiskAlertAt" < ${startOfDay})
    GROUP BY a.id, t.threshold, t.name
    HAVING COALESCE(SUM(x."purchaseAmount"), 0) < t.threshold
  `;

  let sent = 0;
  for (const row of atRisk) {
    try {
      const claimed = await prisma.customerLoyaltyAccount.updateMany({
        where: {
          id: row.accountId,
          OR: [{ lastTierAtRiskAlertAt: null }, { lastTierAtRiskAlertAt: { lt: startOfDay } }],
        },
        data: { lastTierAtRiskAlertAt: new Date() },
      });
      if (claimed.count === 0) continue;

      const account = await prisma.customerLoyaltyAccount.findUnique({
        where: { id: row.accountId },
        select: { contact: { select: { name: true, phone: true, orgId: true } } },
      });
      if (!account?.contact.phone) continue;
      if (!program.whatsappNotifications) continue;

      await sendLoyaltyMessage({
        orgId: account.contact.orgId,
        phone: account.contact.phone,
        waTemplateId: trigger.waTemplateId,
        params: [
          account.contact.name || "Valued Customer",
          row.tierName,
          String(leadDays),
          Number(row.shortfall).toFixed(0),
        ],
        preferTextInSession: program.sendTextInSession,
      });
      sent++;
    } catch (error) {
      log.error({ err: error, accountId: row.accountId }, "Tier-at-risk reminder failed");
    }
  }

  if (sent) log.info({ programId: program.id, sent }, "Tier-at-risk reminders sent");
  return sent;
}

/**
 * "Your reward expires soon."
 *
 * Keyed on an unused redemption code, not on the catalogue: the member has already spent
 * the points, so this recovers value that would otherwise lapse silently. The marker lives
 * on the redemption row because the occasion is per code, not per member.
 */
export async function checkRewardExpiringAlerts(
  program: ReminderProgram,
  trigger: ReminderTrigger,
  now: Date = new Date(),
): Promise<number> {
  if (!isDueThisHour(program, trigger, now)) return 0;
  if (!trigger.waTemplateId) return 0;

  const leadDays = leadDaysFor(LoyaltyEventType.REWARD_EXPIRING, trigger.leadDays);
  const day = targetDay(program, now, leadDays);

  const lapsing = await prisma.loyaltyRedemption.findMany({
    where: {
      account: { programId: program.id, status: "active" },
      // APPROVED is a code the member can actually use; PENDING is still awaiting a
      // decision and warning about it would be premature.
      status: "APPROVED",
      usedAt: null,
      expiryNotifiedAt: null,
      expiresAt: { gte: day.start, lte: day.end },
    },
    select: {
      id: true,
      redemptionCode: true,
      expiresAt: true,
      reward: { select: { name: true } },
      account: {
        select: { id: true, contact: { select: { name: true, phone: true, orgId: true } } },
      },
    },
  });

  let sent = 0;
  for (const redemption of lapsing) {
    try {
      const claimed = await prisma.loyaltyRedemption.updateMany({
        where: { id: redemption.id, expiryNotifiedAt: null },
        data: { expiryNotifiedAt: new Date() },
      });
      if (claimed.count === 0) continue;

      if (!redemption.account.contact.phone) continue;
      if (!program.whatsappNotifications) continue;

      await sendLoyaltyMessage({
        orgId: redemption.account.contact.orgId,
        phone: redemption.account.contact.phone,
        waTemplateId: trigger.waTemplateId,
        params: [
          redemption.account.contact.name || "Valued Customer",
          redemption.reward.name,
          dayjs(redemption.expiresAt).format("DD MMM YYYY"),
          redemption.redemptionCode,
        ],
        preferTextInSession: program.sendTextInSession,
      });
      sent++;
    } catch (error) {
      log.error({ err: error, redemptionId: redemption.id }, "Reward-expiring reminder failed");
    }
  }

  if (sent) log.info({ programId: program.id, sent }, "Reward-expiring reminders sent");
  return sent;
}

/**
 * "A year with us."
 *
 * Month-and-day match on the account's own `createdAt`, excluding the joining year so a
 * member who signed up this morning is not congratulated on it. Mirrors the birthday
 * sweep's `EXTRACT` query.
 */
export async function checkSignupAnniversaries(
  program: ReminderProgram,
  trigger: ReminderTrigger,
  now: Date = new Date(),
): Promise<number> {
  if (!isDueThisHour(program, trigger, now)) return 0;
  if (!trigger.waTemplateId) return 0;

  const { month, date, year, startOfDay } = localDay(program, now);

  const anniversaries = await prisma.$queryRaw<{ id: string; years: number }[]>`
    SELECT a.id, (${year}::int - EXTRACT(YEAR FROM a."createdAt")::int) AS years
    FROM "CustomerLoyaltyAccount" a
    WHERE a."programId" = ${program.id}::uuid
      AND a.status = 'active'
      AND EXTRACT(MONTH FROM a."createdAt") = ${month}
      AND EXTRACT(DAY   FROM a."createdAt") = ${date}
      AND EXTRACT(YEAR  FROM a."createdAt") < ${year}
      AND (a."lastAnniversaryGreetedAt" IS NULL OR a."lastAnniversaryGreetedAt" < ${startOfDay})
  `;

  let sent = 0;
  for (const row of anniversaries) {
    try {
      const claimed = await prisma.customerLoyaltyAccount.updateMany({
        where: {
          id: row.id,
          OR: [
            { lastAnniversaryGreetedAt: null },
            { lastAnniversaryGreetedAt: { lt: startOfDay } },
          ],
        },
        data: { lastAnniversaryGreetedAt: new Date() },
      });
      if (claimed.count === 0) continue;

      const account = await prisma.customerLoyaltyAccount.findUnique({
        where: { id: row.id },
        select: {
          currentPoints: true,
          contact: { select: { name: true, phone: true, orgId: true } },
        },
      });
      if (!account?.contact.phone) continue;
      if (!program.whatsappNotifications) continue;

      await sendLoyaltyMessage({
        orgId: account.contact.orgId,
        phone: account.contact.phone,
        waTemplateId: trigger.waTemplateId,
        params: [
          account.contact.name || "Valued Customer",
          String(row.years),
          account.currentPoints.toString(),
        ],
        preferTextInSession: program.sendTextInSession,
      });

      if (trigger.rewardId) await issueRewardQuietly(row.id, trigger.rewardId);
      sent++;
    } catch (error) {
      log.error({ err: error, accountId: row.id }, "Anniversary reminder failed");
    }
  }

  if (sent) log.info({ programId: program.id, sent }, "Anniversary reminders sent");
  return sent;
}
