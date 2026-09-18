import { log } from "../../utils/logger.js";
import prisma from "../../utils/prisma.js";

import { LoyaltyEventType } from "../../types/enums.js";
import { LOYALTY_JOIN_PAYLOAD } from "./loyaltyEventTemplates.js";
import { renderTemplateBody, sendLoyaltyMessage } from "./loyaltyMessaging.js";

// The body renderer moved to loyaltyMessaging.ts with the rest of the send logic; it is
// re-exported so the cashier receipt code and the tests keep their import.
export { renderTemplateBody };

export type LoyaltyNotificationSkipReason =
  | "no_program"
  | "program_inactive"
  | "whatsapp_disabled"
  | "points_alerts_disabled"
  | "no_phone"
  | "no_template"
  | "template_not_approved"
  | "send_failed";

/**
 * What happened to one notification. `sent` means our send path accepted it, not that
 * Meta delivered it. `text` is the template body with its variables filled — the same
 * words the customer sees — so the cashier receipt can show what went out. `mode` says
 * whether that was the Meta template or, inside an open 24-hour window, a plain message.
 */
export interface LoyaltyNotificationOutcome {
  sent: boolean;
  channel: "whatsapp" | null;
  mode: "template" | "text" | null;
  templateId: string | null;
  text: string | null;
  skippedReason: LoyaltyNotificationSkipReason | null;
}

export const NOTIFICATION_NOT_SENT: LoyaltyNotificationOutcome = {
  sent: false,
  channel: null,
  mode: null,
  templateId: null,
  text: null,
  skippedReason: null,
};

function skipped(reason: LoyaltyNotificationSkipReason): LoyaltyNotificationOutcome {
  return { ...NOTIFICATION_NOT_SENT, skippedReason: reason };
}

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
): Promise<LoyaltyNotificationOutcome> {
  let templateId: string | null = null;
  let renderedText: string | null = null;

  try {
    // 0. Check if WhatsApp notifications are enabled globally for the program
    const program = await prisma.loyaltyProgram.findUnique({
      where: { orgId },
      select: {
        status: true,
        whatsappNotifications: true,
        pointsActivityAlerts: true,
        sendTextInSession: true,
      },
    });

    if (!program) {
      log.warn(`[LoyaltyWaDispatcher] Program not found for org ${orgId}`);
      return skipped("no_program");
    }

    if (program.status !== "active") {
      log.debug(`[LoyaltyWaDispatcher] Loyalty program is inactive for org ${orgId} - skipping`);
      return skipped("program_inactive");
    }

    if (!program.whatsappNotifications) {
      log.debug(
        `[LoyaltyWaDispatcher] WhatsApp notifications disabled for org ${orgId} - skipping`,
      );
      return skipped("whatsapp_disabled");
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
      return skipped("points_alerts_disabled");
    }

    if (!payload.customerPhone) {
      log.warn(`[LoyaltyWaDispatcher] No phone number for command ${commandKey} - skipping`);
      return skipped("no_phone");
    }

    // 1. Resolve Template ID via Event Trigger system
    let components: unknown = null;

    const eventTrigger = await prisma.loyaltyEventTrigger.findFirst({
      where: {
        program: { orgId },
        eventType: commandKey as LoyaltyEventType,
        enabled: true,
      },
      include: { waTemplate: true },
    });

    if (eventTrigger) {
      templateId = eventTrigger.waTemplateId;
      components = (eventTrigger.waTemplate?.data as { components?: unknown } | null)?.components;
    } else {
      templateId = payload.rewardWaTemplateId || null;
      if (templateId) {
        const template = await prisma.waTemplate.findUnique({
          where: { id: templateId },
          select: { data: true },
        });
        components = (template?.data as { components?: unknown } | null)?.components;
      }
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

    renderedText = renderTemplateBody(components, params);

    if (!templateId) return skipped("no_template");

    log.trace(`[LoyaltyWaDispatcher] Sending ${commandKey} to ${payload.customerPhone}`);
    const result = await sendLoyaltyMessage({
      orgId,
      phone: payload.customerPhone,
      waTemplateId: templateId,
      params,
      preferTextInSession: program.sendTextInSession,
      quickReplyPayload:
        commandKey === LoyaltyEventType.NEW_CUSTOMER_WELCOME ? [LOYALTY_JOIN_PAYLOAD] : undefined,
    });

    return {
      sent: result.sent,
      channel: "whatsapp",
      mode: result.mode,
      templateId,
      text: result.text ?? renderedText,
      skippedReason: result.skippedReason,
    };
  } catch (error) {
    log.error(
      { err: error, commandKey, orgId },
      `[LoyaltyWaDispatcher] Error dispatching ${commandKey}`,
    );
    return {
      sent: false,
      channel: templateId ? "whatsapp" : null,
      mode: null,
      templateId,
      text: renderedText,
      skippedReason: "send_failed",
    };
  }
}
