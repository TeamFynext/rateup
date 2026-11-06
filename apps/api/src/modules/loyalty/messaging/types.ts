import type { LoyaltyChannelId } from "./channelIds.js";

export type { LoyaltyChannelId };

/**
 * Why a message did not go out. The first eight are the strings the cashier receipt and
 * the external API already read; keep them spelled as they are.
 */
export type LoyaltySkipReason =
  | "no_program"
  | "program_inactive"
  | "whatsapp_disabled"
  | "points_alerts_disabled"
  | "no_phone"
  | "no_template"
  | "template_not_approved"
  | "send_failed"
  | "no_channel"
  | "session_closed"
  | "unsupported"
  /** An award replayed under its idempotency key: nothing was sent this time. */
  | "replayed";

/** How it went out: a pre-approved template, or free-form inside an open conversation. */
export type LoyaltySendMode = "template" | "text" | "interactive" | "media";

export interface LoyaltySendOutcome {
  sent: boolean;
  channel: Lowercase<LoyaltyChannelId> | null;
  mode: LoyaltySendMode | null;
  templateId: string | null;
  /** The words the customer sees, variables filled — what the receipt shows. */
  text: string | null;
  skippedReason: LoyaltySkipReason | null;
  messageId?: string | null;
  error?: string | null;
}

export interface MessageButton {
  id: string;
  title: string;
}

export interface MessageList {
  /** The label on the button that opens the list. */
  button: string;
  rows: MessageButton[];
}

/** A pre-approved WhatsApp template that can carry the message outside a session. */
export interface WhatsappArtefact {
  waTemplateId: string;
  params: string[];
  quickReplyPayload?: string[];
  teamId?: string;
  flowContext?: { feedbackRequestId?: string | null };
}

/**
 * One message, before any channel has seen it. `text` is the channel-neutral words; the
 * optional parts are richer shapes a channel renders natively or `fitToChannel` turns
 * into text. `artefacts` holds what a channel registered in advance for this message.
 */
export interface LoyaltyMessage {
  key: string;
  text: string | null;
  parts?: {
    /** A heading over the choices, where the channel shows one. */
    title?: string;
    buttons?: MessageButton[];
    list?: MessageList;
    image?: { url: string };
    cta?: { label: string; url: string };
    flow?: { dbFlowId: string; context: Record<string, unknown> };
  };
  artefacts?: { WHATSAPP?: WhatsappArtefact };
  /** Only ever sent inside an open conversation: no template stands in for it. */
  sessionOnly?: boolean;
}

export interface ChannelCapabilities {
  maxTextLength: number;
  replyButtons: { max: number; titleMax: number } | null;
  list: { maxRows: number; titleMax: number } | null;
  image: boolean;
  ctaUrl: boolean;
  flow: boolean;
  /** A message outside an open conversation needs a template registered in advance. */
  proactiveNeedsTemplate: boolean;
}

export interface LoyaltyRecipient {
  orgId: string;
  contactId: string | null;
  accountId: string | null;
  name: string | null;
  phone: string | null;
  email: string | null;
  preferredChannel: LoyaltyChannelId | null;
}

export interface ProgramForSend {
  id: string;
  status: string;
  whatsappNotifications: boolean;
  pointsActivityAlerts: boolean;
  sendTextInSession: boolean;
  enabledChannels: LoyaltyChannelId[];
}

/**
 * `notify`: the business starts the conversation, so the member's preference and the
 * programme's channels decide. `reply`: the customer just wrote in on `channel`, so the
 * answer goes back there, on the number they wrote to.
 */
export type SendIntent =
  | { kind: "notify" }
  | { kind: "reply"; channel: LoyaltyChannelId; phoneId?: string | null };

export interface ChannelSendContext {
  orgId: string;
  program: Pick<ProgramForSend, "sendTextInSession"> | null;
  recipient: LoyaltyRecipient;
  /** Present for replies: the inbound message proves the conversation is open. */
  reply?: { phoneId: string | null };
}

export type DeliveryPlan =
  | {
      ok: true;
      mode: LoyaltySendMode;
      text: string | null;
      templateId: string | null;
      /** Whatever the channel needs to carry out its own plan. */
      detail: unknown;
    }
  | { ok: false; reason: LoyaltySkipReason; text: string | null; templateId: string | null };

export type AcceptedPlan = Extract<DeliveryPlan, { ok: true }>;

/**
 * Everything a medium implements. `plan` decides without sending, so the router can fall
 * back to the next channel before anything has left; `send` never throws.
 */
export interface LoyaltyChannel {
  id: LoyaltyChannelId;
  capabilities: ChannelCapabilities;
  isReachable(recipient: LoyaltyRecipient): true | LoyaltySkipReason;
  plan(ctx: ChannelSendContext, message: LoyaltyMessage): Promise<DeliveryPlan>;
  send(
    ctx: ChannelSendContext,
    message: LoyaltyMessage,
    plan: AcceptedPlan,
  ): Promise<{ ok: boolean; messageId?: string; error?: string }>;
}
