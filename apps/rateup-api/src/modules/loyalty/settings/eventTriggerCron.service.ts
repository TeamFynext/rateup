import dayjs from "dayjs";
import prisma from "../../../utils/prisma.js";
import { log } from "../../../utils/logger.js";
import { sendLoyaltyEvent } from "../messaging/send.js";
import { LoyaltyEventType } from "../../../types/enums.js";
import { assignRewardToCustomer } from "../accounts/account.service.js";
import {
  inZone,
  isDueThisHour,
  leadDaysFor,
  localDay,
  POINTS_EXPIRY_LEDGER_HOUR,
} from "./reminderSchedule.js";

/**
 * Cron job to check for customer birthdays and send WhatsApp templates
 * Runs daily to check all active loyalty customers
 */
export async function checkBirthdayEventTriggers(now: Date = new Date()) {
  try {
    log.info("Birthday Event Trigger Cron - Starting");

    // Get all enabled birthday event triggers
    const birthdayTriggers = await prisma.loyaltyEventTrigger.findMany({
      where: {
        eventType: LoyaltyEventType.BIRTHDAY,
        enabled: true,
      },
      include: {
        program: true,
        reward: true,
      },
    });

    if (birthdayTriggers.length === 0) {
      log.info("Birthday Event Trigger Cron - No enabled triggers found");
      return;
    }

    log.info(`Birthday Event Trigger Cron - Found ${birthdayTriggers.length} enabled triggers`);

    // Process each trigger's program
    for (const trigger of birthdayTriggers) {
      try {
        if (!isDueThisHour(trigger.program, trigger, now)) continue;

        // The programme's own calendar day. Read in UTC before, so a Dubai venue matched
        // birthdays against a day that had not started there yet.
        const {
          month: todayMonth,
          date: todayDate,
          startOfDay: startOfToday,
        } = localDay(trigger.program, now);

        const birthdayAccountIds = await prisma.$queryRaw<{ id: string }[]>`
          SELECT a.id
          FROM "CustomerLoyaltyAccount" a
          JOIN "Contact" c ON c.id = a."contactId"
          WHERE a."programId" = ${trigger.programId}::uuid
            AND a.status = 'active'
            AND c.dob IS NOT NULL
            AND EXTRACT(MONTH FROM c.dob) = ${todayMonth}
            AND EXTRACT(DAY FROM c.dob) = ${todayDate}
        `;

        const birthdayCustomers = await prisma.customerLoyaltyAccount.findMany({
          where: { id: { in: birthdayAccountIds.map((row) => row.id) } },
          include: {
            contact: {
              select: {
                id: true,
                phone: true,
                name: true,
                dob: true,
                orgId: true,
              },
            },
            program: true,
          },
        });

        log.info(
          `Birthday Event Trigger Cron - Program ${trigger.program.name}: ${birthdayCustomers.length} customers with birthday today`,
        );

        // Send WhatsApp template to each birthday customer
        for (const customer of birthdayCustomers) {
          try {
            if (!customer.contact.phone) {
              log.warn(`Birthday Event Trigger - Customer ${customer.id} has no phone number`);
              continue;
            }

            const claimed = await prisma.customerLoyaltyAccount.updateMany({
              where: {
                id: customer.id,
                OR: [
                  { lastBirthdayGreetedAt: null },
                  { lastBirthdayGreetedAt: { lt: startOfToday } },
                ],
              },
              data: { lastBirthdayGreetedAt: new Date() },
            });

            if (claimed.count === 0) {
              log.info(
                `Birthday Event Trigger - Customer ${customer.id} already greeted today, skipping`,
              );
              continue;
            }

            // The gift below is issued whatever happens to the greeting, so a failed send
            // keeps the day's marker: retrying it would offer the gift a second time.
            const outcome = await sendLoyaltyEvent(
              customer.contact.orgId,
              LoyaltyEventType.BIRTHDAY,
              { accountId: customer.id },
              {
                name: customer.contact.name || "Valued Customer",
                rewardName: trigger?.reward?.name || "a special reward",
              },
              { program: trigger.program },
            );
            if (outcome.skippedReason === "send_failed") {
              log.warn({ accountId: customer.id }, "Birthday greeting failed; not retried today");
            }

            // If a reward is configured, issue it automatically
            if (trigger.rewardId) {
              await issueRewardToCustomer(customer.id, trigger.rewardId);
            }

            log.info(
              `Birthday Event Trigger - Sent to customer ${customer.id} (${customer.contact.phone})`,
            );
          } catch (error) {
            log.error(
              { err: error },
              `Birthday Event Trigger - Error sending to customer ${customer.id}:`,
            );
          }
        }
      } catch (error) {
        log.error(
          { err: error },
          `Birthday Event Trigger - Error processing program ${trigger.programId}:`,
        );
      }
    }

    log.info("Birthday Event Trigger Cron - Completed");
  } catch (error) {
    log.error({ err: error }, "Birthday Event Trigger Cron - Fatal error:");
  }
}

/**
 * Cron job to check for inactive customers and send reminder templates
 * Runs daily to check customers based on configured trigger days
 */
export async function checkInactivityEventTriggers(now: Date = new Date()) {
  try {
    log.info("Inactivity Event Trigger Cron - Starting");

    // Get all enabled inactivity reminder triggers
    const inactivityTriggers = await prisma.loyaltyEventTrigger.findMany({
      where: {
        eventType: LoyaltyEventType.INACTIVITY_REMINDER,
        enabled: true,
        triggerDays: {
          not: null,
        },
      },
      include: {
        program: true,
        reward: true,
      },
    });

    if (inactivityTriggers.length === 0) {
      log.info("Inactivity Event Trigger Cron - No enabled triggers found");
      return;
    }

    log.info(`Inactivity Event Trigger Cron - Found ${inactivityTriggers.length} enabled triggers`);

    // Process each trigger
    for (const trigger of inactivityTriggers) {
      try {
        if (!trigger.triggerDays) continue;
        if (!isDueThisHour(trigger.program, trigger, now)) continue;

        const inactivityDate = dayjs().subtract(trigger.triggerDays, "days").toDate();

        log.info(
          `Inactivity Event Trigger - Program ${trigger.program.name}: Checking customers inactive since ${dayjs(inactivityDate).format("YYYY-MM-DD")}`,
        );

        // Get all active customers who haven't had activity in X days
        const inactiveCustomers = await prisma.customerLoyaltyAccount.findMany({
          where: {
            programId: trigger.programId,
            status: "active",
            lastActivityAt: {
              lte: inactivityDate,
            },
          },
          include: {
            contact: {
              select: {
                id: true,
                phone: true,
                name: true,
                orgId: true,
              },
            },
            program: true,
          },
        });

        log.info(
          `Inactivity Event Trigger - Program ${trigger.program.name}: ${inactiveCustomers.length} inactive customers found`,
        );

        // Send reminder to each inactive customer
        for (const customer of inactiveCustomers) {
          try {
            if (!customer.contact.phone) {
              log.warn(`Inactivity Event Trigger - Customer ${customer.id} has no phone number`);
              continue;
            }

            // One nudge per lapse. The claim used to be `lte: inactivityDate`, which came
            // true again every `triggerDays` — a customer who never returned was nudged
            // every month forever. Requiring the last nudge to predate their last activity
            // means they are only nudged again if they came back and went quiet again.
            const claimedAt = new Date();
            const claimed = await prisma.customerLoyaltyAccount.updateMany({
              where: {
                id: customer.id,
                OR: [
                  { lastInactivityReminderAt: null },
                  { lastInactivityReminderAt: { lt: customer.lastActivityAt } },
                ],
              },
              data: { lastInactivityReminderAt: claimedAt },
            });

            if (claimed.count === 0) {
              log.info(
                `Inactivity Event Trigger - Customer ${customer.id} already claimed by another process, skipping`,
              );
              continue;
            }

            // Calculate days since last activity
            const daysSinceActivity = dayjs().diff(dayjs(customer.lastActivityAt), "days");

            const outcome = await sendLoyaltyEvent(
              customer.contact.orgId,
              LoyaltyEventType.INACTIVITY_REMINDER,
              { accountId: customer.id },
              {
                name: customer.contact.name || "Valued Customer",
                balance: customer?.currentPoints?.toString() || "0",
              },
              { program: trigger.program },
            );
            // A nudge that only failed to send is tried again next sweep; one that also
            // carries a reward is not, since the reward is issued regardless.
            if (outcome.skippedReason === "send_failed" && !trigger.rewardId) {
              await releaseClaim(() =>
                prisma.customerLoyaltyAccount.updateMany({
                  where: { id: customer.id, lastInactivityReminderAt: claimedAt },
                  data: { lastInactivityReminderAt: customer.lastInactivityReminderAt },
                }),
              );
              continue;
            }
            // If a reward is configured to incentivize return, issue it
            if (trigger.rewardId) {
              await issueRewardToCustomer(customer.id, trigger.rewardId);
            }

            log.info(
              `Inactivity Event Trigger - Sent reminder to customer ${customer.id} (${daysSinceActivity} days inactive)`,
            );
          } catch (error) {
            log.error(
              { err: error },
              `Inactivity Event Trigger - Error sending to customer ${customer.id}:`,
            );
          }
        }
      } catch (error) {
        log.error(
          { err: error },
          `Inactivity Event Trigger - Error processing program ${trigger.programId}:`,
        );
      }
    }

    log.info("Inactivity Event Trigger Cron - Completed");
  } catch (error) {
    log.error({ err: error }, "Inactivity Event Trigger Cron - Fatal error:");
  }
}

/** Undoes a claim whose send failed, so the next sweep tries the member again. */
async function releaseClaim(release: () => Promise<unknown>): Promise<void> {
  try {
    await release();
  } catch (error) {
    log.error({ err: error }, "Could not release a reminder claim after a failed send");
  }
}

/**
 * The points on `accountId` old enough to lapse by `cutoff` — earned before it, and not
 * already written off by an `expire` row that references them.
 *
 * The same anti-join `checkPointsExpiration` uses to decide what to expire, so the warning
 * and the act agree. Clamped to the live balance, because points earned and then spent are
 * gone whatever their age.
 */
async function pointsExpiringFor(accountId: string, cutoff: Date): Promise<number> {
  const rows = await prisma.$queryRaw<{ total: bigint | null }[]>`
    SELECT COALESCE(SUM(t.points), 0) AS total
    FROM "LoyaltyTransaction" t
    WHERE t."accountId" = ${accountId}::uuid
      AND t."transactionType" = 'earn'
      AND t.points > 0
      AND t."createdAt" <= ${cutoff}
      AND NOT EXISTS (
        SELECT 1 FROM "LoyaltyTransaction" e
        WHERE e."transactionType" = 'expire'
          AND e."referenceId" = t.id::text
      )
  `;
  const earned = Number(rows[0]?.total ?? 0);
  const account = await prisma.customerLoyaltyAccount.findUnique({
    where: { id: accountId },
    select: { currentPoints: true },
  });
  return Math.max(0, Math.min(earned, account?.currentPoints ?? 0));
}

async function issueRewardToCustomer(accountId: string, rewardId: string) {
  try {
    const assignment = await assignRewardToCustomer(accountId, rewardId);
    log.info(
      `Issued reward ${rewardId} to customer account ${accountId} (code: ${assignment.shortCode})`,
    );
  } catch (error) {
    log.error({ err: error }, `Error issuing reward ${rewardId} to customer ${accountId}:`);
  }
}

/**
 * Cron job to send expiry alert 14 days before points expire
 * Targets customers whose lastActivityAt is (expirationMonths - 14 days) ago and still have points
 */
export async function checkPointsExpiryAlerts(now: Date = new Date()) {
  try {
    log.info("Points Expiry Alert Cron - Starting");

    const programsWithExpiration = await prisma.loyaltyProgram.findMany({
      where: {
        status: "active",
        enablePointsExpiration: true,
      },
      select: {
        id: true,
        name: true,
        orgId: true,
        pointsExpirationMonths: true,
        status: true,
        whatsappNotifications: true,
        pointsActivityAlerts: true,
        sendTextInSession: true,
        enabledChannels: true,
        // The reminder sweep reads this to decide whether the programme's chosen hour
        // has struck where the venue actually is.
        timezone: true,
      },
    });

    if (programsWithExpiration.length === 0) {
      log.info("Points Expiry Alert Cron - No programs with expiration enabled");
      return;
    }

    for (const program of programsWithExpiration) {
      try {
        // This programme's trigger, not the org's. It used to match on
        // `program: { orgId }` from inside this very loop, so an org running two
        // programmes could send one programme's template to the other's members.
        const trigger = await prisma.loyaltyEventTrigger.findFirst({
          where: {
            programId: program.id,
            eventType: LoyaltyEventType.POINTS_EXPIRY_ALERT,
            enabled: true,
          },
        });

        if (!trigger) continue;
        if (!isDueThisHour(program, trigger, now)) continue;

        // How far ahead to warn. Was hardcoded at 14 days in three places.
        const leadDays = leadDaysFor(LoyaltyEventType.POINTS_EXPIRY_ALERT, trigger.leadDays);

        const alertFrom = dayjs()
          .subtract(program.pointsExpirationMonths, "months")
          .add(leadDays, "days")
          .startOf("day")
          .toDate();
        const alertTo = dayjs()
          .subtract(program.pointsExpirationMonths, "months")
          .add(leadDays, "days")
          .endOf("day")
          .toDate();

        const customersNearExpiry = await prisma.customerLoyaltyAccount.findMany({
          where: {
            programId: program.id,
            status: "active",
            currentPoints: { gt: 0 },
            transactions: {
              some: {
                transactionType: "earn",
                points: { gt: 0 },
                createdAt: { gte: alertFrom, lte: alertTo },
              },
            },
          },
          include: {
            contact: {
              select: { id: true, phone: true, name: true, orgId: true },
            },
          },
        });

        log.info(
          `Points Expiry Alert - Program ${program.name}: ${customersNearExpiry.length} customers near expiry`,
        );

        const expiryDate = dayjs().add(leadDays, "days").toDate();
        const startOfToday = dayjs().startOf("day").toDate();

        for (const account of customersNearExpiry) {
          try {
            if (!account.contact.phone) continue;

            if (!program.whatsappNotifications) continue;

            // Claim the send. This alert had no marker at all, so a second run of the
            // job — a retried tick, a catch-up occurrence — told the same customer twice.
            const claimedAt = new Date();
            const claimed = await prisma.customerLoyaltyAccount.updateMany({
              where: {
                id: account.id,
                OR: [
                  { lastPointsExpiryAlertAt: null },
                  { lastPointsExpiryAlertAt: { lt: startOfToday } },
                ],
              },
              data: { lastPointsExpiryAlertAt: claimedAt },
            });
            if (claimed.count === 0) continue;

            // What will actually expire, not the whole balance. The message used to
            // announce `currentPoints`, which is every point the member holds — a customer
            // with 500 points of which 40 are old enough to lapse was told 500 were going.
            const expiringPoints = await pointsExpiringFor(account.id, alertTo);
            if (expiringPoints <= 0) continue;

            const outcome = await sendLoyaltyEvent(
              account.contact.orgId,
              LoyaltyEventType.POINTS_EXPIRY_ALERT,
              { accountId: account.id },
              {
                name: account.contact.name || "Valued Customer",
                points: expiringPoints.toString(),
                date: dayjs(expiryDate).format("DD MMM YYYY"),
              },
              { program },
            );
            if (outcome.skippedReason === "send_failed") {
              await releaseClaim(() =>
                prisma.customerLoyaltyAccount.updateMany({
                  where: { id: account.id, lastPointsExpiryAlertAt: claimedAt },
                  data: { lastPointsExpiryAlertAt: account.lastPointsExpiryAlertAt },
                }),
              );
              continue;
            }

            log.info(
              `Points Expiry Alert - Sent to customer ${account.id} (expires ${dayjs(expiryDate).format("DD MMM YYYY")})`,
            );
          } catch (error) {
            log.error(
              { err: error },
              `Points Expiry Alert - Error sending to customer ${account.id}:`,
            );
          }
        }
      } catch (error) {
        log.error({ err: error }, `Points Expiry Alert - Error processing program ${program.id}:`);
      }
    }

    log.info("Points Expiry Alert Cron - Completed");
  } catch (error) {
    log.error({ err: error }, "Points Expiry Alert Cron - Fatal error:");
  }
}

/**
 * Cron job to expire old points based on program configuration
 * Runs daily to check all programs with points expiration enabled
 */
/**
 * Expire points that have aged out, and tell the members whose points went.
 *
 * Unlike the other reminders this one writes the ledger, so it is gated on the programme's
 * local hour rather than a trigger's chosen one — the message is a consequence of the
 * write, not a thing scheduled on its own. The `expire` row that references each expired
 * `earn` row is what makes a re-run a no-op, so a late or duplicated tick is harmless.
 */
export async function checkPointsExpiration(now: Date = new Date()) {
  try {
    log.info("Points Expiration Cron - Starting");

    // Get all active programs with points expiration enabled
    const programsWithExpiration = await prisma.loyaltyProgram.findMany({
      where: {
        status: "active",
        enablePointsExpiration: true,
      },
      select: {
        id: true,
        name: true,
        orgId: true,
        pointsExpirationMonths: true,
        status: true,
        whatsappNotifications: true,
        pointsActivityAlerts: true,
        sendTextInSession: true,
        enabledChannels: true,
        timezone: true,
      },
    });

    if (programsWithExpiration.length === 0) {
      log.info("Points Expiration Cron - No programs with expiration enabled");
      return;
    }

    log.info(
      `Points Expiration Cron - Found ${programsWithExpiration.length} programs with expiration enabled`,
    );

    let totalPointsExpired = 0;
    let totalCustomersAffected = 0;

    // Process each program
    for (const program of programsWithExpiration) {
      try {
        // Expire on the programme's own early morning, so the day a member's points
        // "last until" is the day they saw on the reminder.
        if (inZone(now, program.timezone).hour() !== POINTS_EXPIRY_LEDGER_HOUR) continue;

        // Calculate expiration cutoff date
        const expirationDate = dayjs().subtract(program.pointsExpirationMonths, "months").toDate();

        log.info(
          `Points Expiration - Program ${program.name}: Expiring points earned before ${dayjs(expirationDate).format("YYYY-MM-DD")}`,
        );

        // Get all active customer accounts in this program
        const customerAccounts = await prisma.customerLoyaltyAccount.findMany({
          where: {
            programId: program.id,
            status: "active",
            currentPoints: {
              gt: 0, // Only customers with points
            },
          },
          include: {
            contact: {
              select: {
                id: true,
                phone: true,
                name: true,
              },
            },
          },
        });

        log.info(
          `Points Expiration - Program ${program.name}: Checking ${customerAccounts.length} customer accounts`,
        );

        // Process each customer account
        for (const account of customerAccounts) {
          try {
            // Find all 'earn' transactions older than expiration date that haven't been fully expired
            const expiredTransactions = await prisma.$queryRaw<{ id: string; points: number }[]>`
              SELECT DISTINCT t.id, t.points
              FROM "LoyaltyTransaction" t
              WHERE t."accountId" = ${account.id}::uuid
                AND t."transactionType" = 'earn'
                AND t.points > 0
                AND t."createdAt" < ${expirationDate}
                AND NOT EXISTS (
                  SELECT 1
                  FROM "LoyaltyTransaction" e
                  WHERE e."accountId" = t."accountId"
                    AND e."transactionType" = 'expire'
                    AND e."referenceId" = t.id
                )
            `;

            if (expiredTransactions.length === 0) {
              continue; // No expired points for this customer
            }

            // Calculate total expired points
            const totalExpiredPoints = expiredTransactions.reduce(
              (sum, t) => sum + Number(t.points),
              0,
            );

            // Don't expire more points than the customer currently has.
            const pointsToExpire = Math.min(totalExpiredPoints, account.currentPoints);

            if (pointsToExpire <= 0) {
              continue;
            }

            let remaining = pointsToExpire;
            let runningBalance = account.currentPoints;

            const expiryRows = expiredTransactions.map((expiredTx) => {
              const allocated = Math.min(remaining, Number(expiredTx.points));
              remaining -= allocated;
              runningBalance -= allocated;

              return {
                accountId: account.id,
                programId: program.id,
                transactionType: "expire",
                points: -allocated, // Negative to deduct
                balanceAfter: runningBalance,
                source: "expiration",
                referenceId: expiredTx.id, // Link to original earn transaction
                description: `Points expired after ${program.pointsExpirationMonths} months`,
                metadata: {
                  expirationDate: dayjs(expirationDate).format("YYYY-MM-DD"),
                  originalTransactionId: expiredTx.id,
                  originalPoints: Number(expiredTx.points),
                },
              };
            });

            await prisma.$transaction(async (tx) => {
              await tx.loyaltyTransaction.createMany({ data: expiryRows });

              await tx.customerLoyaltyAccount.update({
                where: { id: account.id },
                data: {
                  currentPoints: runningBalance,
                },
              });
            });

            totalPointsExpired += pointsToExpire;
            totalCustomersAffected++;

            log.info(
              `Points Expiration - Expired ${pointsToExpire} points for customer ${account.contact.name || account.contact.phone} (account ${account.id})`,
            );

            // The ledger is already written, so a failed notice is not retried.
            if (account.contact.phone) {
              await sendLoyaltyEvent(
                program.orgId,
                LoyaltyEventType.POINTS_EXPIRED,
                { accountId: account.id },
                {
                  name: account.contact.name || "Valued Customer",
                  points: pointsToExpire.toString(),
                },
                { program },
              );
            }
          } catch (error) {
            log.error(
              { err: error },
              `Points Expiration - Error processing account ${account.id}:`,
            );
          }
        }

        log.info(`Points Expiration - Program ${program.name}: Completed`);
      } catch (error) {
        log.error({ err: error }, `Points Expiration - Error processing program ${program.id}:`);
      }
    }

    log.info(
      `Points Expiration Cron - Completed: ${totalPointsExpired} points expired for ${totalCustomersAffected} customers`,
    );
  } catch (error) {
    log.error({ err: error }, "Points Expiration Cron - Fatal error:");
  }
}
