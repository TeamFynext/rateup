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
    rewardWaTemplateId?: string;
    [key: string]: any;
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
      log.debug(
        `[LoyaltyWaDispatcher] Loyalty program is inactive for org ${orgId} - skipping`,
      );
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
      log.warn(
        `[LoyaltyWaDispatcher] No phone number for command ${commandKey} - skipping`,
      );
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
    const params: string[] = [];

    // Common: Name is usually first.
    if (payload.customerName) params.push(payload.customerName);

    if (
      commandKey === LoyaltyEventType.POINTS_ISSUED ||
      commandKey === LoyaltyEventType.POINTS_ADJUSTED
    ) {
      if (payload.points !== undefined) params.push(payload.points.toString());
      if (payload.balanceAfter !== undefined)
        params.push(payload.balanceAfter.toString());
    } else if (
      commandKey === LoyaltyEventType.REWARD_ISSUED ||
      commandKey === LoyaltyEventType.REWARD_REDEEMED
    ) {
      if (payload.rewardName) params.push(payload.rewardName);
      if (payload.redemptionCode) params.push(payload.redemptionCode);
      if (payload.points !== undefined)
        params.push(Math.abs(payload.points).toString()); // Cost
    } else if (commandKey === LoyaltyEventType.TIER_UPGRADED) {
      if (payload.newTier) params.push(payload.newTier);
    }

    log.trace(
      `[LoyaltyWaDispatcher] Sending ${commandKey} to ${payload.customerPhone}`,
    );
    await handleSendTemplate(
      templateId,
      orgId,
      payload.customerPhone,
      params,
      eventTrigger?.program?.whatsappSettingsId,
    );
  } catch (error) {
    console.log("🚀 ~ dispatchLoyaltyNotification ~ error:", error);
    log.error(
      `[LoyaltyWaDispatcher] Error dispatching ${commandKey}: %o`,
      error,
    );
    // Don't throw, silence error to avoid blocking transaction
  }
}
