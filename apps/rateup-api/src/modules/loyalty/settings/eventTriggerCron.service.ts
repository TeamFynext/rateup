import dayjs from "dayjs";
import prisma from "../../../utils/prisma.js";
import { log } from "../../../utils/logger.js";
import { handleSendTemplate } from "../../contact/contact.utils.js";
import { LoyaltyEventType } from "../../../types/enums.js";

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

    log.info(
      `Birthday Event Trigger Cron - Found ${birthdayTriggers.length} enabled triggers`,
    );

    // Process each trigger's program
    for (const trigger of birthdayTriggers) {
      try {
        // Get all active customers with birthdays today in this program
        const customersWithBirthday =
          await prisma.customerLoyaltyAccount.findMany({
            where: {
              programId: trigger.programId,
              status: "active",
              contact: {
                dob: {
                  not: null,
                },
              },
            },
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

        // Filter customers whose birthday is today
        const birthdayCustomers = customersWithBirthday.filter((customer) => {
          if (!customer.contact.dob) return false;
          const dob = dayjs(customer.contact.dob);
          return dob.month() + 1 === todayMonth && dob.date() === todayDate;
        });

        log.info(
          `Birthday Event Trigger Cron - Program ${trigger.program.name}: ${birthdayCustomers.length} customers with birthday today`,
        );

        // Send WhatsApp template to each birthday customer
        for (const customer of birthdayCustomers) {
          try {
            if (!customer.contact.phone) {
              log.warn(
                `Birthday Event Trigger - Customer ${customer.id} has no phone number`,
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

    log.info(
      `Inactivity Event Trigger Cron - Found ${inactivityTriggers.length} enabled triggers`,
    );

    // Process each trigger
    for (const trigger of inactivityTriggers) {
      try {
        if (!trigger.triggerDays) continue;

        const inactivityDate = dayjs()
          .subtract(trigger.triggerDays, "days")
          .toDate();

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
              log.warn(
                `Inactivity Event Trigger - Customer ${customer.id} has no phone number`,
              );
              continue;
            }

            // Atomically claim this customer by updating lastActivityAt only if it
            // still matches the original value — prevents duplicate sends if the
            // cron overlaps or runs concurrently across multiple instances.
            const claimed = await prisma.customerLoyaltyAccount.updateMany({
              where: {
                id: customer.id,
                lastActivityAt: customer.lastActivityAt,
              },
              data: { lastActivityAt: new Date() },
            });

            if (claimed.count === 0) {
              log.info(
                `Inactivity Event Trigger - Customer ${customer.id} already claimed by another process, skipping`,
              );
              continue;
            }

            // Calculate days since last activity
            const daysSinceActivity = dayjs().diff(
              dayjs(customer.lastActivityAt),
              "days",
            );

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
 * Helper function to issue a reward to a customer
 */
async function issueRewardToCustomer(accountId: string, rewardId: string) {
  try {
    const reward = await prisma.loyaltyReward.findUnique({
      where: { id: rewardId },
    });

    if (!reward) {
      log.error(`Reward ${rewardId} not found`);
      return;
    }

    // Generate unique short code for the reward
    const shortCode = generateShortCode();

    // Create customer reward assignment
    await prisma.customerReward.create({
      data: {
        shortCode,
        accountId,
        rewardId,
        status: "ISSUED",
      },
    });

    log.info(
      `Issued reward ${rewardId} to customer account ${accountId} (code: ${shortCode})`,
    );
  } catch (error) {
    log.error(
      { err: error },
      `Error issuing reward ${rewardId} to customer ${accountId}:`,
    );
  }
}

/**
 * Helper function to generate a unique short code for rewards
 */
function generateShortCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
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
      log.info(
        "Points Expiry Alert Cron - No programs with expiration enabled",
      );
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

        // Customers whose lastActivityAt is exactly (expirationMonths months - 14 days) ago
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

        const customersNearExpiry =
          await prisma.customerLoyaltyAccount.findMany({
            where: {
              programId: program.id,
              status: "active",
              currentPoints: { gt: 0 },
              lastActivityAt: { gte: alertFrom, lte: alertTo },
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
        log.error(
          { err: error },
          `Points Expiry Alert - Error processing program ${program.id}:`,
        );
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
        const expirationDate = dayjs()
          .subtract(program.pointsExpirationMonths, "months")
          .toDate();

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
            const expiredTransactions = await prisma.$queryRaw<
              { id: string; points: number }[]
            >`
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

            // Don't expire more points than the customer currently has
            const pointsToExpire = Math.min(
              totalExpiredPoints,
              account.currentPoints,
            );

            if (pointsToExpire <= 0) {
              continue;
            }

            // Create expiration transactions for each expired earn transaction
            for (const expiredTx of expiredTransactions) {
              const pointsFromThisTx = Number(expiredTx.points);

              // Calculate new balance after expiring these points
              const currentBalance =
                await prisma.customerLoyaltyAccount.findUnique({
                  where: { id: account.id },
                  select: { currentPoints: true },
                });

              const newBalance = Math.max(
                0,
                (currentBalance?.currentPoints || 0) - pointsFromThisTx,
              );

              // Create expiration transaction
              await prisma.loyaltyTransaction.create({
                data: {
                  accountId: account.id,
                  programId: program.id,
                  transactionType: "expire",
                  points: -pointsFromThisTx, // Negative to deduct
                  balanceAfter: newBalance,
                  source: "expiration",
                  referenceId: expiredTx.id, // Link to original earn transaction
                  description: `Points expired after ${program.pointsExpirationMonths} months`,
                  metadata: {
                    expirationDate: dayjs(expirationDate).format("YYYY-MM-DD"),
                    originalTransactionId: expiredTx.id,
                  },
                },
              });

              // Update customer's current points
              await prisma.customerLoyaltyAccount.update({
                where: { id: account.id },
                data: {
                  currentPoints: newBalance,
                  lastActivityAt: new Date(),
                },
              });
            }

            totalPointsExpired += pointsToExpire;
            totalCustomersAffected++;

            log.info(
              `Points Expiration - Expired ${pointsToExpire} points for customer ${account.contact.name || account.contact.phone} (account ${account.id})`,
            );

            // Send WA notification for points expiry
            if (account.contact.phone) {
              await handleSendTemplate(
                await resolveEventTriggerTemplateId(
                  program.orgId,
                  LoyaltyEventType.POINTS_EXPIRED,
                ),
                program.orgId,
                account.contact.phone,
                [
                  account.contact.name || "Valued Customer",
                  pointsToExpire.toString(),
                ],
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
        log.error(
          { err: error },
          `Points Expiration - Error processing program ${program.id}:`,
        );
      }
    }

    log.info(
      `Points Expiration Cron - Completed: ${totalPointsExpired} points expired for ${totalCustomersAffected} customers`,
    );
  } catch (error) {
    log.error({ err: error }, "Points Expiration Cron - Fatal error:");
  }
}
