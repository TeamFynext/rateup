import { log } from "../../utils/logger.js";
import prisma from "../../utils/prisma.js";

import { LoyaltyEventType } from "../../types/enums.js";
import { handleSendTemplate } from "../contact/contact.utils.js";

/**
 * Dispatcher for Loyalty WhatsApp Notifications
 * Handles resolving templates via commands and sending messages
 */
export async function dispatchLoyaltyNotification(
  orgId: string,
  commandKey: string,
  payload: {
    customerPhone: string;
    customerName?: string;
    // Common payload fields
    points?: number;
    balanceAfter?: number;
    reason?: string;
    rewardName?: string;
    redemptionCode?: string;
    expiresAt?: Date | string;
    oldTier?: string;
    newTier?: string;
    lifetimePoints?: number;
    // Reward Override Context
    rewardId?: string;
    rewardWaTemplateId?: string | null;
    [key: string]: unknown;
  },
) {
  try {
    // 0. Check if WhatsApp notifications are enabled globally for the program
    const program = await prisma.loyaltyProgram.findUnique({
      where: { orgId },
      select: {
        status: true,
        whatsappNotifications: true,
        pointsActivityAlerts: true,
      },
    });

    if (!program) {
      log.warn(`[LoyaltyWaDispatcher] Program not found for org ${orgId}`);
      return;
    }

    if (program.status !== "active") {
      log.debug(`[LoyaltyWaDispatcher] Loyalty program is inactive for org ${orgId} - skipping`);
      return;
    }

    if (!program.whatsappNotifications) {
      log.debug(
        `[LoyaltyWaDispatcher] WhatsApp notifications disabled for org ${orgId} - skipping`,
      );
      return;
    }

    // Check Points Activity Alerts specifically for point-related commands
    if (
      (commandKey === LoyaltyEventType.POINTS_ISSUED ||
        commandKey === LoyaltyEventType.POINTS_ADJUSTED) &&
      !program.pointsActivityAlerts
    ) {
      log.debug(
        `[LoyaltyWaDispatcher] Points activity alerts disabled for org ${orgId} - skipping`,
      );
      return;
    }

    if (!payload.customerPhone) {
      log.warn(`[LoyaltyWaDispatcher] No phone number for command ${commandKey} - skipping`);
      return;
    }
    // 1. Resolve Template ID via Event Trigger system
    let templateId: string | null = null;

    const eventTrigger = await prisma.loyaltyEventTrigger.findFirst({
      where: {
        program: { orgId },
        eventType: commandKey as LoyaltyEventType,
        enabled: true,
      },
      include: {
        waTemplate: true,
        program: {
          select: {
            whatsappSettingsId: true,
          },
        },
      },
    });

    if (eventTrigger) {
      templateId = eventTrigger.waTemplateId;
    } else {
      templateId = payload.rewardWaTemplateId || null;
    }
    const text = (value: string | number | undefined) =>
      value === undefined || value === null ? "" : String(value);

    const params: string[] = [text(payload.customerName)];

    if (
      commandKey === LoyaltyEventType.POINTS_ISSUED ||
      commandKey === LoyaltyEventType.POINTS_ADJUSTED
    ) {
      params.push(text(payload.points), text(payload.balanceAfter));
    } else if (
      commandKey === LoyaltyEventType.REWARD_ISSUED ||
      commandKey === LoyaltyEventType.REWARD_REDEEMED
    ) {
      params.push(
        text(payload.rewardName),
        text(payload.redemptionCode),
        // Cost
        text(payload.points === undefined ? undefined : Math.abs(payload.points)),
      );
    } else if (commandKey === LoyaltyEventType.TIER_UPGRADED) {
      params.push(text(payload.newTier));
    }

    log.trace(`[LoyaltyWaDispatcher] Sending ${commandKey} to ${payload.customerPhone}`);
    await handleSendTemplate(templateId, orgId, payload.customerPhone, params);
  } catch (error) {
    log.error(
      { err: error, commandKey, orgId },
      `[LoyaltyWaDispatcher] Error dispatching ${commandKey}`,
    );
  }
}
