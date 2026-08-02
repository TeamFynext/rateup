import dayjs from "dayjs";
import prisma from "../../../utils/prisma.js";
import { log } from "../../../utils/logger.js";
import { handleSendTemplate } from "../../contact/contact.utils.js";
import { LoyaltyEventType } from "../../../types/enums.js";
import { assignRewardToCustomer } from "../accounts/account.service.js";

/**
 * Cron job to check for customer birthdays and send WhatsApp templates
 * Runs daily to check all active loyalty customers
 */
export async function checkBirthdayEventTriggers() {
  try {
    log.info("Birthday Event Trigger Cron - Starting");

    const today = dayjs();
    const todayMonth = today.month() + 1; // dayjs months are 0-indexed
    const todayDate = today.date();
    // The boundary the per-customer claim below compares against, so a second run
    // on the same day greets nobody twice. See issues.txt 20.36.
    const startOfToday = today.startOf("day").toDate();

    // Get all enabled birthday event triggers
    const birthdayTriggers = await prisma.loyaltyEventTrigger.findMany({
      where: {
        eventType: LoyaltyEventType.BIRTHDAY,
        enabled: true,
        waTemplateId: {
          not: null,
        },
      },
      include: {
        program: true,
        waTemplate: true,
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
        // The month and day are matched in SQL. This used to load EVERY active
        // customer with a date of birth, for each trigger, and filter in
        // JavaScript — so the whole membership was materialised daily, per
        // trigger, to find the handful with a birthday. See issues.txt 20.36.
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

            // Claim the customer BEFORE sending, exactly as the inactivity cron
            // does. This cron used to have no idempotency guard and record nothing
            // per customer, so a second run on the same day — a redeploy, a retry,
            // two instances — greeted every birthday customer again.
            // See issues.txt 20.36.
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

            // Prepare dynamic variables for template
            const dynamicVariables = [
              customer.contact.name || "Valued Customer",
              trigger?.reward?.name || "a special reward",
            ];

            // Send WhatsApp template
            await handleSendTemplate(
              trigger.waTemplateId,
              customer.contact.orgId,
              customer.contact.phone,
              dynamicVariables,
            );

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
export async function checkInactivityEventTriggers() {
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
        waTemplateId: {
          not: null,
        },
      },
      include: {
        program: true,
        waTemplate: true,
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

            // Atomically claim this customer before sending, so an overlapping
            // run cannot double-send.
            //
            // The claim is written to `lastInactivityReminderAt`, NOT to
            // `lastActivityAt`. It used to be the latter — the same column this
            // cron SELECTS on — so reminding a dormant customer marked them as
            // active today: their inactivity clock restarted and they would not be
            // reminded again for another full window. The reminder cancelled its
            // own follow-up, and the customer's record claimed activity they had
            // not performed. See issues.txt 20.37.
            const claimed = await prisma.customerLoyaltyAccount.updateMany({
              where: {
                id: customer.id,
                OR: [
                  { lastInactivityReminderAt: null },
                  { lastInactivityReminderAt: { lte: inactivityDate } },
                ],
              },
              data: { lastInactivityReminderAt: new Date() },
            });

            if (claimed.count === 0) {
              log.info(
                `Inactivity Event Trigger - Customer ${customer.id} already claimed by another process, skipping`,
              );
              continue;
            }

            // Calculate days since last activity
            const daysSinceActivity = dayjs().diff(dayjs(customer.lastActivityAt), "days");

            // Prepare dynamic variables for template
            const dynamicVariables = [
              customer.contact.name || "Valued Customer",
              customer?.currentPoints?.toString() || "0",
            ];

            // Send WhatsApp template
            await handleSendTemplate(
              trigger.waTemplateId,
              customer.contact.orgId,
              customer.contact.phone,
              dynamicVariables,
            );
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

async function resolveEventTriggerTemplateId(
  orgId: string,
  eventType: LoyaltyEventType,
): Promise<string | null> {
  const trigger = await prisma.loyaltyEventTrigger.findFirst({
    where: {
      program: { orgId },
      eventType,
      enabled: true,
      waTemplateId: { not: null },
    },
    select: { waTemplateId: true },
  });
  return trigger?.waTemplateId ?? null;
}

/**
 * Issues a reward to a customer, through assignRewardToCustomer.
 *
 * This used to be a THIRD short-code generator with its own alphabet, and unlike
 * assignRewardToCustomer it did not loop until it found a free code. shortCode is
 * @unique, so a collision threw — and the catch here swallowed it, which meant the
 * customer received the birthday message promising "a special reward" and silently
 * got nothing. The same swallow hid the "already assigned" error on a repeat run.
 *
 * The catch stays, because a failed reward must not stop the rest of the run, but
 * it now logs what actually happened rather than hiding a collision behind an
 * INFO-level success line. See issues.txt 20.36 and 20.9.
 */
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
export async function checkPointsExpiryAlerts() {
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
      },
    });

    if (programsWithExpiration.length === 0) {
      log.info("Points Expiry Alert Cron - No programs with expiration enabled");
      return;
    }

    for (const program of programsWithExpiration) {
      try {
        // Find the enabled POINTS_EXPIRY_ALERT trigger for this program
        const trigger = await prisma.loyaltyEventTrigger.findFirst({
          where: {
            program: { orgId: program.orgId },
            eventType: LoyaltyEventType.POINTS_EXPIRY_ALERT,
            enabled: true,
            waTemplateId: { not: null },
          },
        });

        if (!trigger) continue;

        // Customers holding an EARN transaction that expires in 14 days.
        //
        // The alert used to select on `lastActivityAt` while the expiry itself
        // expires individual earn transactions by their own `createdAt` — two
        // different clocks for one event. A customer could be warned about an
        // expiry that never arrived, or lose points with no warning at all,
        // depending on which of the two had moved most recently. This selects on
        // the clock that actually decides, which is the earning's own age.
        // See issues.txt 20.37.
        const alertFrom = dayjs()
          .subtract(program.pointsExpirationMonths, "months")
          .add(14, "days")
          .startOf("day")
          .toDate();
        const alertTo = dayjs()
          .subtract(program.pointsExpirationMonths, "months")
          .add(14, "days")
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

        const expiryDate = dayjs().add(14, "days").toDate();

        for (const account of customersNearExpiry) {
          try {
            if (!account.contact.phone) continue;

            await handleSendTemplate(
              trigger.waTemplateId,
              account.contact.orgId,
              account.contact.phone,
              [
                account.contact.name || "Valued Customer",
                account.currentPoints.toString(),
                dayjs(expiryDate).format("DD MMM YYYY"),
              ],
            );

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
export async function checkPointsExpiration() {
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

            // The cap is APPLIED, not merely computed.
            //
            // It used to be used only for the log line and the running total: the
            // loop underneath wrote an `expire` row for each stale earning's FULL
            // value while the balance was separately clamped with
            // `Math.max(0, …)`. So the balance was protected and the ledger was
            // not — a customer with 150 points of stale earnings but a 30-point
            // balance, having spent the rest, got expire rows totalling -150 while
            // their balance fell by 30. Replaying the ledger stopped reconciling
            // with currentPoints, and the "points expired" figure the cron reports
            // was inflated for every customer who had ever redeemed anything.
            //
            // The allocation walks the stale earnings oldest-first and stops when
            // the cap is used up. Earnings past that point still get an expire row,
            // with zero points: the row is what the NOT EXISTS above keys on, so
            // without it they would be re-examined on every run forever.
            //
            // One balance write, one transaction. The old loop re-read the balance
            // from the database once per stale transaction — an N+1 per customer —
            // and wrote each row on its own with nothing around any of it.
            // See issues.txt 20.38.
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

              // `lastActivityAt` is deliberately NOT touched. Expiring a
              // customer's points used to set it to now, which pushed their next
              // expiry alert — and their inactivity reminder — out by a full
              // window even though they had done nothing. See issues.txt 20.37.
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

            // Send WA notification for points expiry
            if (account.contact.phone) {
              await handleSendTemplate(
                await resolveEventTriggerTemplateId(program.orgId, LoyaltyEventType.POINTS_EXPIRED),
                program.orgId,
                account.contact.phone,
                [account.contact.name || "Valued Customer", pointsToExpire.toString()],
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
