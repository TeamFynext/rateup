import prisma from "../../utils/prisma.js";
import { log } from "../../utils/logger.js";
import { type MeterLimit, notifyLimitReached } from "../notification/notification.service.js";

const NOTIFIED_COLUMN = {
  activeContacts: "activeContactLimitNotifiedPeriod",
  campaignCredits: "campaignCreditLimitNotifiedPeriod",
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
