import dayjs from "dayjs";

import { PlatformType } from "../../../generated/prisma/client.js";
import { WaTemplateStatus } from "../../types/enums.js";
import { log } from "../../utils/logger.js";
import prisma from "../../utils/prisma.js";
import { handleSendTemplate } from "../contact/contact.utils.js";
import { sendMessage } from "../whatsapp/whatsappSurvey/wasurvey.service.js";
import { createTextMessage } from "../whatsapp/whatsappSurvey/wasurvey.utils.js";
import { parsePhoneforWa } from "./util.js";

/**
 * Session-aware sending for every loyalty message.
 *
 * A loyalty notification is a Meta template: it needs Meta's approval before it can go
 * out, and outside an open 24-hour customer-service window it is the only thing WhatsApp
 * will deliver. Inside that window a plain text message is free and immediate — so when
 * the customer has messaged the business recently, the template's body is sent as text
 * (even while the template is still awaiting approval) and the template itself is kept
 * for customers who have not.
 */

/** Meta's window is 24 h from the customer's last message; keep a margin for clock skew. */
export const SESSION_WINDOW_MINUTES = 24 * 60 - 10;

interface TemplateComponentLike {
  type?: string;
  format?: string;
  text?: string;
}

function componentsOf(components: unknown): TemplateComponentLike[] {
  return Array.isArray(components) ? (components as TemplateComponentLike[]) : [];
}

function componentType(component: TemplateComponentLike): string {
  return String(component?.type ?? "").toUpperCase();
}

function fill(text: string, params: string[]): string {
  return text.replace(/\{\{(\d+)\}\}/g, (_match, index: string) => {
    const value = params[Number(index) - 1];
    return value === undefined ? "" : value;
  });
}

/**
 * Fills `{{n}}` placeholders in a template's BODY component with the parameters sent to
 * Meta, in order. Returns null when the template has no body text.
 */
export function renderTemplateBody(components: unknown, params: string[]): string | null {
  const body = componentsOf(components).find((component) => componentType(component) === "BODY");
  if (!body?.text) return null;
  return fill(body.text, params);
}

/**
 * Whether a template loses nothing when sent as plain text: a body, optionally a text
 * header and a footer. Buttons and media headers have no text equivalent, so a template
 * carrying them is always sent as a template.
 */
export function isTextDowngradable(components: unknown): boolean {
  const list = componentsOf(components);
  if (!list.some((component) => componentType(component) === "BODY")) return false;
  return list.every((component) => {
    switch (componentType(component)) {
      case "BODY":
      case "FOOTER":
        return true;
      case "HEADER":
        return String(component.format ?? "TEXT").toUpperCase() === "TEXT";
      default:
        return false;
    }
  });
}

/**
 * The template as one text message: a bold header line when there is one, then the
 * body. The footer is dropped — it is boilerplate ("Powered by …") that reads as noise
 * in a chat.
 */
export function renderTemplateAsText(components: unknown, params: string[]): string | null {
  const body = renderTemplateBody(components, params);
  if (body === null) return null;
  const header = componentsOf(components).find(
    (component) =>
      componentType(component) === "HEADER" &&
      String(component.format ?? "TEXT").toUpperCase() === "TEXT" &&
      component.text,
  );
  return header?.text ? `*${fill(header.text, params)}*\n\n${body}` : body;
}

/**
 * Whether the customer has messaged the business within the last 24 hours — on the
 * given number when one is known, otherwise on any WhatsApp number of the org.
 *
 * "Never heard from them" is closed: a customer registered at the till has no window,
 * and only a template can reach them.
 */
export async function isCustomerSessionOpen(input: {
  orgId: string;
  phone: string;
  whatsappSettingsPhoneId?: string | null;
}): Promise<boolean> {
  const phone = parsePhoneforWa(input.phone);
  if (!phone) return false;

  const contact = await prisma.contact.findUnique({
    where: { contact_phone_org_id_unique: { phone, orgId: input.orgId } },
    select: { id: true, lastReceivedMessageTimeStamp: true },
  });
  if (!contact?.lastReceivedMessageTimeStamp) return false;

  let lastInbound: Date = contact.lastReceivedMessageTimeStamp;

  if (input.whatsappSettingsPhoneId) {
    // Messages record the channel as the business number, not the phoneId.
    const channel = await prisma.whatsappSettings.findFirst({
      where: { phoneId: input.whatsappSettingsPhoneId },
      select: { phone: true },
    });
    if (channel?.phone) {
      const latest = await prisma.waMessage.findFirst({
        where: {
          contactId: contact.id,
          sourceIdentifier: channel.phone,
          messageBody: { path: ["exchangeProcess"], equals: "receive" },
        },
        orderBy: { waCreatedAt: "desc" },
        select: { waCreatedAt: true, createdAt: true },
      });
      // The window belongs to the number the customer wrote to; no message on this
      // number means no window here, whatever they said to another one.
      if (!latest) return false;
      lastInbound = latest.waCreatedAt ?? latest.createdAt;
    }
  }

  return dayjs().diff(lastInbound, "minute") < SESSION_WINDOW_MINUTES;
}

/** The program's text-in-window switch, defaulting to on when there is no program row. */
export async function programPrefersTextInSession(orgId: string): Promise<boolean> {
  const program = await prisma.loyaltyProgram.findUnique({
    where: { orgId },
    select: { sendTextInSession: true },
  });
  return program?.sendTextInSession ?? true;
}

export type LoyaltySendSkipReason = "no_template" | "template_not_approved" | "send_failed";

export interface LoyaltySendResult {
  sent: boolean;
  /** How it went out — a Meta template, or the same words as a plain message. */
  mode: "template" | "text" | null;
  templateId: string | null;
  /** The words the customer sees, with variables filled. */
  text: string | null;
  skippedReason: LoyaltySendSkipReason | null;
}

function acceptedBy(result: unknown): boolean {
  return !(
    result !== undefined &&
    result !== null &&
    typeof result === "object" &&
    "status" in result &&
    (result as { status?: unknown }).status === false
  );
}

/**
 * Sends one loyalty message, as text when the window allows it and as the template
 * otherwise. `textFallback` is the plain-text reply a keyword has when it carries no
 * template; it is only ever sent inside an open window.
 */
export async function sendLoyaltyMessage(input: {
  orgId: string;
  phone: string;
  waTemplateId: string | null | undefined;
  params: string[];
  textFallback?: string | null;
  /** The program's switch. Off means "always the template". */
  preferTextInSession: boolean;
}): Promise<LoyaltySendResult> {
  const { orgId, phone, params } = input;
  const templateId = input.waTemplateId ?? null;

  const template = templateId
    ? await prisma.waTemplate.findUnique({
        where: { id: templateId },
        select: { data: true, whatsappSettingsPhoneId: true },
      })
    : null;
  const data = (template?.data ?? null) as {
    components?: unknown;
    status?: string;
  } | null;
  const components = data?.components;

  const text = renderTemplateAsText(components, params) ?? input.textFallback ?? null;

  const windowOpen =
    input.preferTextInSession &&
    text !== null &&
    (template === null || isTextDowngradable(components)) &&
    (await isCustomerSessionOpen({
      orgId,
      phone,
      whatsappSettingsPhoneId: template?.whatsappSettingsPhoneId,
    }));

  if (windowOpen && text !== null) {
    log.trace(`[LoyaltyMessaging] Sending as text to ${phone} (window open)`);
    const result = await sendMessage(
      orgId,
      createTextMessage(phone, null, text),
      undefined,
      undefined,
      // The window belongs to the number the template would have used; keep the thread
      // on that number rather than the org's default one.
      template?.whatsappSettingsPhoneId ?? undefined,
      PlatformType.WHATSAPP,
      undefined,
      null,
      "AUTOMATED",
      true,
      false,
      false,
    );
    const sent = acceptedBy(result);
    return {
      sent,
      mode: "text",
      templateId,
      text,
      skippedReason: sent ? null : "send_failed",
    };
  }

  if (!templateId || !template) {
    return { sent: false, mode: null, templateId: null, text, skippedReason: "no_template" };
  }

  if (data?.status !== WaTemplateStatus.APPROVED) {
    log.debug(
      `[LoyaltyMessaging] Template ${templateId} is ${data?.status ?? "unknown"}, not approved - skipping`,
    );
    return { sent: false, mode: null, templateId, text, skippedReason: "template_not_approved" };
  }

  log.trace(`[LoyaltyMessaging] Sending template ${templateId} to ${phone}`);
  const result = await handleSendTemplate(templateId, orgId, phone, params);
  const sent = acceptedBy(result);
  return {
    sent,
    mode: "template",
    templateId,
    text: renderTemplateBody(components, params) ?? text,
    skippedReason: sent ? null : "send_failed",
  };
}
