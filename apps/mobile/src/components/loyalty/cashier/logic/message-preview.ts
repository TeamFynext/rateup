import type { LoyaltyNotificationOutcome } from "@/api/loyalty/loyalty.type";
import { LoyaltyEventType, type EventTrigger } from "@/api/loyalty/loyalty.type";

import type { Receipt } from "./cashier.types";

/** The slice of a WhatsApp template the preview reads — the list and detail shapes both fit. */
export interface PreviewTemplate {
  id: string;
  data: {
    status?: string;
    components?: ReadonlyArray<{ type: string; text?: string }>;
  };
}

/**
 * The WhatsApp block on a receipt: the words the customer just received, or the reason
 * nothing was sent. The server reports the outcome for points awards; for redemptions and
 * gifts the same template arithmetic is repeated here, from the trigger and template the
 * program has configured.
 */
export type PreviewStatus =
  | "sent"
  /**
   * App only: the write is queued, so the message has not been attempted yet.
   *
   * A deliberate divergence from the web, which has no vocabulary for "not sent yet" — and
   * every existing status would be a false statement. `no_event` renders nothing, hiding
   * that a message *is* coming later; `not_connected` and `send_failed` are simply untrue.
   * The branch is dead code on the web, so this is safe to back-port.
   */
  | "queued"
  | "not_connected"
  | "program_inactive"
  | "notifications_off"
  | "no_trigger"
  | "template_not_approved"
  | "send_failed"
  | "no_event";

export interface WhatsAppPreview {
  status: PreviewStatus;
  body: string | null;
  /** How a sent message went out, when the server said. */
  mode?: "template" | "text" | null;
}

export interface PreviewInput {
  receipt: Receipt;
  triggers: EventTrigger[];
  templates: PreviewTemplate[];
  waConnected: boolean;
  program: {
    status: string;
    whatsappNotifications?: boolean;
    pointsActivityAlerts?: boolean;
    pointsName: string;
  };
}

/** Parameters in the order `loyaltyWaDispatcher` sends them, per event. */
export function templateParams(receipt: Receipt): string[] {
  const first = receipt.customer.name.split(" ")[0] || receipt.customer.name;
  switch (receipt.event) {
    case LoyaltyEventType.POINTS_ISSUED:
    case LoyaltyEventType.POINTS_ADJUSTED:
      return [first, String(receipt.delta), String(receipt.after)];
    case LoyaltyEventType.REWARD_ISSUED:
    case LoyaltyEventType.REWARD_REDEEMED:
      return [first, receipt.rewardName ?? "", receipt.code ?? "", String(Math.abs(receipt.delta))];
    case LoyaltyEventType.TIER_UPGRADED:
      return [first, receipt.tierAfter ?? ""];
    default:
      return [first];
  }
}

export function renderBody(template: PreviewTemplate | undefined, params: string[]): string | null {
  const body = template?.data?.components?.find(
    (component) => String(component.type).toUpperCase() === "BODY",
  );
  const text = body?.text;
  if (!text) return null;
  return text.replace(/\{\{(\d+)\}\}/g, (_match, index: string) => params[Number(index) - 1] ?? "");
}

function fromServer(outcome: LoyaltyNotificationOutcome): WhatsAppPreview {
  if (outcome.sent) return { status: "sent", body: outcome.text, mode: outcome.mode };
  switch (outcome.skippedReason) {
    case "template_not_approved":
      return { status: "template_not_approved", body: outcome.text };
    case "program_inactive":
      return { status: "program_inactive", body: outcome.text };
    case "whatsapp_disabled":
    case "points_alerts_disabled":
      return { status: "notifications_off", body: outcome.text };
    case "no_template":
      return { status: "no_trigger", body: null };
    case "send_failed":
      return { status: "send_failed", body: outcome.text };
    default:
      return { status: "not_connected", body: outcome.text };
  }
}

export function buildWhatsAppPreview(input: PreviewInput): WhatsAppPreview {
  const { receipt, program } = input;
  if (receipt.notification) return fromServer(receipt.notification);
  if (!receipt.event) return { status: "no_event", body: null };

  const trigger = input.triggers.find((t) => t.eventType === receipt.event && t.enabled);
  const template = trigger?.waTemplateId
    ? input.templates.find((t) => t.id === trigger.waTemplateId)
    : undefined;
  const body = renderBody(template, templateParams(receipt));

  // A queued write has not been attempted, so nothing below applies — the programme could
  // be configured perfectly and the message still not have gone. The body is still shown
  // because the trigger and template are cached locally, so the wording *is* knowable; the
  // caller prefixes it to say the numbers in it are estimates.
  if (receipt.provisional) return { status: "queued", body, mode: null };

  if (!input.waConnected) return { status: "not_connected", body };
  if (program.status !== "active") return { status: "program_inactive", body };
  if (program.whatsappNotifications === false) return { status: "notifications_off", body };
  if (
    (receipt.event === LoyaltyEventType.POINTS_ISSUED ||
      receipt.event === LoyaltyEventType.POINTS_ADJUSTED) &&
    program.pointsActivityAlerts === false
  ) {
    return { status: "notifications_off", body };
  }
  if (!trigger?.waTemplateId) return { status: "no_trigger", body: null };
  if (template && template.data?.status !== "APPROVED")
    return { status: "template_not_approved", body };
  return { status: "sent", body };
}
