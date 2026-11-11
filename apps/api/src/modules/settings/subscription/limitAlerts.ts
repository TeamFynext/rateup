import prisma from "../../../utils/prisma.js";
import { log } from "../../../utils/logger.js";
import {
  type MeterLimit,
  notifyLimitReached,
  notifyOrderLimitNearing,
} from "../notifications/notification.service.js";

const NOTIFIED_COLUMN = {
  activeContacts: "activeContactLimitNotifiedPeriod",
  campaignCredits: "campaignCreditLimitNotifiedPeriod",
  shopOrders: "shopOrderLimitNotifiedPeriod",
} as const;

/**
 * Alerts once per limit per period. The claim is a conditional write, so concurrent
 * messages that all cross the limit race here and only the one that flips the column
 * sends; the stored period also survives restarts. Callers have already established that
 * the limit is reached.
 */
export async function maybeNotifyLimitReached(
  orgId: string,
  limit: MeterLimit,
  period: Date,
): Promise<void> {
  try {
    const column = NOTIFIED_COLUMN[limit];
    const claimed = await prisma.usageStats.updateMany({
      where: {
        orgId,
        OR: [{ [column]: null }, { [column]: { not: period } }],
      },
      data: { [column]: period },
    });
    if (claimed.count === 0) return;

    await notifyLimitReached(orgId, limit);
  } catch (error) {
    log.error({ err: error, orgId, limit }, "Failed to evaluate the limit alert");
  }
}

/** Most of the month's allowance is gone; warned once a period, like the limit alert. */
const LIMIT_WARNING_SHARE = 0.8;

/**
 * Alerts on a counted shop order: a warning at 80% of the month's orders and the limit alert
 * at 100%, each once a period. Never throws.
 */
export async function maybeNotifyOrderUsage(
  orgId: string,
  used: number,
  max: number | undefined,
  period: Date,
): Promise<void> {
  if (max === undefined) return;
  if (used >= max) return maybeNotifyLimitReached(orgId, "shopOrders", period);
  if (used < Math.ceil(max * LIMIT_WARNING_SHARE)) return;
  try {
    const claimed = await prisma.usageStats.updateMany({
      where: {
        orgId,
        OR: [{ shopOrderLimitWarnedPeriod: null }, { shopOrderLimitWarnedPeriod: { not: period } }],
      },
      data: { shopOrderLimitWarnedPeriod: period },
    });
    if (claimed.count > 0) await notifyOrderLimitNearing(orgId, used, max);
  } catch (error) {
    log.error({ err: error, orgId }, "Failed to evaluate the order-limit warning");
  }
}
