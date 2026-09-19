import { LoyaltyEventType } from "../../../types/enums.js";
import { log } from "../../../utils/logger.js";
import prisma from "../../../utils/prisma.js";
import { getConversationBudget } from "../../subscription/conversationBudget.js";
import {
  checkBirthdayEventTriggers,
  checkInactivityEventTriggers,
  checkPointsExpiration,
  checkPointsExpiryAlerts,
} from "./eventTriggerCron.service.js";
import {
  checkRewardExpiringAlerts,
  checkSignupAnniversaries,
  checkTierAtRiskAlerts,
  type ReminderProgram,
  type ReminderTrigger,
} from "./reminderOccasions.service.js";

/**
 * The hourly loyalty reminder sweep.
 *
 * Replaces four fixed daily jobs that pinned no timezone and so fired at the worker
 * container's midnight — a Dubai venue's birthday greeting arrived at 4am local. This wakes
 * every hour instead and each occasion asks whether the hour its programme chose has just
 * struck *there*.
 *
 * The occasions that predate this change still own their own programme iteration, so they
 * are called once per tick and gate themselves; the three new ones are per-programme and
 * are called for each programme with an enabled trigger. Both halves are wrapped so one
 * failing occasion cannot cost the rest their tick.
 */

/** Occasions handled per programme by `reminderOccasions.service.ts`. */
const PER_PROGRAM_OCCASIONS = {
  [LoyaltyEventType.TIER_AT_RISK]: checkTierAtRiskAlerts,
  [LoyaltyEventType.REWARD_EXPIRING]: checkRewardExpiringAlerts,
  [LoyaltyEventType.SIGNUP_ANNIVERSARY]: checkSignupAnniversaries,
} as const;

type PerProgramOccasion = keyof typeof PER_PROGRAM_OCCASIONS;

async function guarded(name: string, run: () => Promise<unknown>): Promise<void> {
  try {
    await run();
  } catch (error) {
    log.error({ err: error }, `Loyalty reminder occasion "${name}" failed`);
  }
}

/**
 * Whether the org can afford to fan a reminder out, and to how many.
 *
 * No loyalty send path checked this before. It did not matter much for a notification sent
 * one-per-transaction, but a reminder sweep addresses the whole member base at once and
 * could spend a month's conversation allowance in a single tick. Unmetered plans and orgs
 * with no bookkeeping are treated as "within limit", matching `getConversationBudget`.
 */
export async function reminderSendBudget(orgId: string): Promise<number | null> {
  try {
    const budget = await getConversationBudget(orgId);
    if (!budget.metered || budget.remaining === undefined) return null;
    return budget.remaining;
  } catch (error) {
    // Bookkeeping the customer cannot fix must not silence their programme.
    log.warn({ err: error, orgId }, "Could not read conversation budget for reminders");
    return null;
  }
}

export async function runLoyaltyReminderSweep(now: Date = new Date()): Promise<void> {
  log.info("Loyalty reminder sweep - starting");

  // The occasions that shipped before this change iterate programmes themselves and gate
  // on each programme's local hour internally.
  await guarded("birthday", () => checkBirthdayEventTriggers(now));
  await guarded("inactivity", () => checkInactivityEventTriggers(now));
  await guarded("pointsExpiryAlert", () => checkPointsExpiryAlerts(now));
  await guarded("pointsExpiration", () => checkPointsExpiration(now));

  const programs = await prisma.loyaltyProgram.findMany({
    where: { status: "active" },
    select: {
      id: true,
      name: true,
      orgId: true,
      timezone: true,
      status: true,
      whatsappNotifications: true,
      pointsActivityAlerts: true,
      sendTextInSession: true,
      enabledChannels: true,
      tierQualificationWindowMonths: true,
      eventTriggers: {
        where: {
          enabled: true,
          eventType: { in: Object.keys(PER_PROGRAM_OCCASIONS) as PerProgramOccasion[] },
        },
        select: {
          eventType: true,
          rewardId: true,
          leadDays: true,
          sendHour: true,
        },
      },
    },
  });

  for (const program of programs) {
    if (program.eventTriggers.length === 0) continue;

    const budget = await reminderSendBudget(program.orgId);
    if (budget === 0) {
      log.warn(
        { programId: program.id, orgId: program.orgId },
        "Skipping loyalty reminders - the org's conversation allowance is fully used",
      );
      continue;
    }

    const { eventTriggers: _triggers, ...context } = program satisfies ReminderProgram & {
      eventTriggers: unknown;
    };

    for (const trigger of program.eventTriggers) {
      const occasion = PER_PROGRAM_OCCASIONS[trigger.eventType as PerProgramOccasion];
      if (!occasion) continue;
      await guarded(`${trigger.eventType}:${program.id}`, () =>
        occasion(context, trigger satisfies ReminderTrigger, now),
      );
    }
  }

  log.info("Loyalty reminder sweep - completed");
}
