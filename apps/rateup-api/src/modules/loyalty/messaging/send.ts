import { LoyaltyEventType, LoyaltyTemplateTypes } from "../../../types/enums.js";
import { log } from "../../../utils/logger.js";
import prisma from "../../../utils/prisma.js";
import { eventVars, LOYALTY_EVENT_CATALOG, type EventData } from "./catalog.js";
import { buildEventMessage } from "./content.js";
import { fitToChannel } from "./degrade.js";
import { resolveRecipient, type RecipientRef } from "./recipient.js";
import { getLoyaltyChannel } from "./registry.js";
import { candidateChannels } from "./router.js";
import type {
  ChannelSendContext,
  LoyaltyMessage,
  LoyaltyRecipient,
  LoyaltySendOutcome,
  LoyaltySkipReason,
  ProgramForSend,
  SendIntent,
} from "./types.js";

/**
 * The one way a loyalty message leaves: pick the member's channel, let it decide how the
 * message can go, fall back to the next channel when it cannot, and report what happened.
 */

export const NOT_SENT: LoyaltySendOutcome = {
  sent: false,
  channel: null,
  mode: null,
  templateId: null,
  text: null,
  skippedReason: null,
};

export function skipped(
  reason: LoyaltySkipReason,
  extra: Partial<LoyaltySendOutcome> = {},
): LoyaltySendOutcome {
  return { ...NOT_SENT, ...extra, skippedReason: reason };
}

const programSelect = {
  id: true,
  status: true,
  whatsappNotifications: true,
  pointsActivityAlerts: true,
  sendTextInSession: true,
  enabledChannels: true,
} as const;

export async function loadProgramForSend(orgId: string): Promise<ProgramForSend | null> {
  return await prisma.loyaltyProgram.findUnique({ where: { orgId }, select: programSelect });
}

export async function sendLoyalty(input: {
  orgId: string;
  to: RecipientRef;
  message: LoyaltyMessage | ((recipient: LoyaltyRecipient) => LoyaltyMessage);
  intent: SendIntent;
  /** Already loaded by the caller; looked up for a notification when omitted. */
  program?: ProgramForSend | null;
}): Promise<LoyaltySendOutcome> {
  const { orgId, intent } = input;
  const recipient = await resolveRecipient(orgId, input.to);
  if (!recipient) return skipped("no_phone");

  const program =
    intent.kind === "reply"
      ? null
      : input.program !== undefined
        ? input.program
        : await loadProgramForSend(orgId);
  const message = typeof input.message === "function" ? input.message(recipient) : input.message;

  const ctx: ChannelSendContext = {
    orgId,
    program,
    recipient,
    ...(intent.kind === "reply" ? { reply: { phoneId: intent.phoneId ?? null } } : {}),
  };

  let first: LoyaltySendOutcome | null = null;
  for (const id of candidateChannels(program, recipient, intent)) {
    const channel = getLoyaltyChannel(id)!;
    const outcomeBase = { channel: id.toLowerCase() as LoyaltySendOutcome["channel"] };

    const reachable = channel.isReachable(recipient);
    if (reachable !== true) {
      first ??= skipped(reachable, { text: message.text });
      continue;
    }

    const fitted = fitToChannel(message, channel.capabilities);
    if (!fitted) {
      first ??= skipped("unsupported", { ...outcomeBase, text: message.text });
      continue;
    }

    const plan = await channel.plan(ctx, fitted);
    if (!plan.ok) {
      first ??= skipped(plan.reason, {
        ...outcomeBase,
        text: plan.text,
        templateId: plan.templateId,
      });
      continue;
    }

    // No fallback past this point: a send that timed out may still have been delivered,
    // and a second channel would say it twice.
    const result = await channel.send(ctx, fitted, plan);
    if (!result.ok) {
      log.warn(
        { orgId, channel: id, key: message.key, error: result.error },
        "Loyalty send failed",
      );
    }
    return {
      sent: result.ok,
      ...outcomeBase,
      mode: plan.mode,
      templateId: plan.templateId,
      text: plan.text,
      skippedReason: result.ok ? null : "send_failed",
      messageId: result.messageId ?? null,
      error: result.error ?? null,
    };
  }

  return first ?? skipped("no_channel", { text: message.text });
}

/**
 * An automatic message for `event`: the programme's switches first, then the event's own
 * words and template, then `sendLoyalty`.
 */
export async function sendLoyaltyEvent(
  orgId: string,
  event: LoyaltyEventType,
  to: RecipientRef,
  data: EventData,
  options: {
    program?: ProgramForSend | null;
    /** A reward's own template, used when the event has no switched-on message of its own. */
    rewardWaTemplateId?: string | null;
  } = {},
): Promise<LoyaltySendOutcome> {
  try {
    const program =
      options.program !== undefined ? options.program : await loadProgramForSend(orgId);
    if (!program) return skipped("no_program");
    if (program.status !== "active") return skipped("program_inactive");
    if (!program.whatsappNotifications) return skipped("whatsapp_disabled");
    const definition = LOYALTY_EVENT_CATALOG[event];
    if (definition.alertClass === "points" && !program.pointsActivityAlerts) {
      return skipped("points_alerts_disabled");
    }

    const trigger = await prisma.loyaltyEventTrigger.findUnique({
      where: { programId_eventType: { programId: program.id, eventType: event } },
      select: { enabled: true, body: true, waTemplateId: true },
    });
    // A message the merchant switched off stays off; only a reward's own template can
    // still speak for it, as it always could.
    const on = trigger?.enabled === true;
    const waTemplateId = on ? trigger.waTemplateId : (options.rewardWaTemplateId ?? null);
    const body = on ? (trigger.body ?? definition.defaultBody) : null;
    if (!waTemplateId && body === null) return skipped("no_template");

    const joinKeyword = definition.joinButton
      ? (
          await prisma.loyaltyWaCommand.findFirst({
            where: { orgId, type: LoyaltyTemplateTypes.CustomerRegistration },
            select: { requestMessage: true },
          })
        )?.requestMessage
      : null;

    return await sendLoyalty({
      orgId,
      to,
      program,
      intent: { kind: "notify" },
      message: (recipient) =>
        buildEventMessage({
          event,
          vars: eventVars(event, { ...data, name: data.name ?? recipient.name ?? "Customer" }),
          body,
          waTemplateId,
          joinKeyword,
          sessionInteractive: program.sendTextInSession,
        }),
    });
  } catch (error) {
    log.error({ err: error, orgId, event }, "Loyalty event message failed");
    return skipped("send_failed");
  }
}
