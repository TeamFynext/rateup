import { WaAutomatedReplyResponseType } from "../../types/enums.js";
import { log } from "../../utils/logger.js";
import prisma from "../../utils/prisma.js";
import { sendTemplateToPhone } from "../whatsapp/messageTemplates/wa_templates.service.js";
import { sendTextMessage } from "../whatsapp/whatsappSurvey/wasurvey.service.js";
import { replacedContentByDynamicVariable } from "./settings/settings.service.js";

/**
 * Commands for Loyalty WhatsApp Notifications
 */
export const LOYALTY_WA_COMMANDS = {
  POINTS_ISSUED: "LOYALTY_POINTS_ISSUED",
  POINTS_ADJUSTED: "LOYALTY_POINTS_ADJUSTED",
  REWARD_ISSUED: "LOYALTY_REWARD_ISSUED",
  REWARD_REDEEMED: "LOYALTY_REWARD_REDEEMED",
  TIER_UPGRADED: "LOYALTY_TIER_UPGRADED",
};

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
      (commandKey === LOYALTY_WA_COMMANDS.POINTS_ISSUED ||
        commandKey === LOYALTY_WA_COMMANDS.POINTS_ADJUSTED) &&
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
    // 1. Resolve Template ID
    let templateId: string | null = null;
    let templateSource = "command";

    // Check for Reward Level Override
    if (payload.rewardWaTemplateId) {
      templateId = payload.rewardWaTemplateId;
      templateSource = "reward_override";
    }
    let responseType = WaAutomatedReplyResponseType.Template; // For now, only template messages
    let content: any = "";
    // Fallback to Command Resolution
    if (!templateId) {
      const command = await prisma.loyaltyWaCommand.findUnique({
        where: {
          request_message_org_unique: {
            orgId,
            requestMessage: commandKey,
          },
        },
      });
      if (command) {
        templateId = command?.waTemplateId;
        responseType = command.responseType as WaAutomatedReplyResponseType;
        content = command.content;
      } else {
        log.trace(
          `[LoyaltyWaDispatcher] No command/template found for ${commandKey} in org ${orgId}`,
        );
        return; // Fail-safe: silently skip
      }
    }
    const params: string[] = [];

    // Common: Name is usually first.
    if (payload.customerName) params.push(payload.customerName);

    if (
      commandKey === LOYALTY_WA_COMMANDS.POINTS_ISSUED ||
      commandKey === LOYALTY_WA_COMMANDS.POINTS_ADJUSTED
    ) {
      if (payload.points !== undefined) params.push(payload.points.toString());
      if (payload.balanceAfter !== undefined)
        params.push(payload.balanceAfter.toString());
    } else if (
      commandKey === LOYALTY_WA_COMMANDS.REWARD_ISSUED ||
      commandKey === LOYALTY_WA_COMMANDS.REWARD_REDEEMED
    ) {
      if (payload.rewardName) params.push(payload.rewardName);
      if (payload.redemptionCode) params.push(payload.redemptionCode);
      if (payload.points !== undefined)
        params.push(Math.abs(payload.points).toString()); // Cost
    } else if (commandKey === LOYALTY_WA_COMMANDS.TIER_UPGRADED) {
      if (payload.newTier) params.push(payload.newTier);
    }

    // Construct Body Component with params
    const components = [
      {
        type: "body",
        parameters: params.map((p) => ({
          type: "text",
          text: String(p),
        })),
      },
    ];

    log.trace(
      `[LoyaltyWaDispatcher] Sending ${commandKey} (${templateSource}) to ${payload.customerPhone}`,
    );

    if (responseType === WaAutomatedReplyResponseType.Template) {
      // Fetch the template details to get name and language
      const template = await prisma.waTemplate.findUnique({
        where: { id: templateId },
      });

      if (!template) {
        log.warn(
          `[LoyaltyWaDispatcher] Template ${templateId} not found for command ${commandKey}`,
        );
        return;
      }

      const templateData = template.data as any;
      const templateName = templateData?.name;

      if (!templateName) {
        log.warn(
          `[LoyaltyWaDispatcher] Invalid template data for ${templateId}`,
        );
        return;
      }
      await sendTemplateToPhone({
        orgId,
        phone: payload.customerPhone,
        dbTemplate: template as any,
        teamId: null,
        userId: null,
        header: components?.[0] as any, // escaping strict type check for now if needed, but looks standard
      });
    } else if (responseType === WaAutomatedReplyResponseType.Text) {
      const message = replacedContentByDynamicVariable(content, params);
      await sendTextMessage(
        { phone: payload.customerPhone, orgId },
        null,
        message,
      );
    }
  } catch (error) {
    log.error(
      `[LoyaltyWaDispatcher] Error dispatching ${commandKey}: %o`,
      error,
    );
    // Don't throw, silence error to avoid blocking transaction
  }
}
