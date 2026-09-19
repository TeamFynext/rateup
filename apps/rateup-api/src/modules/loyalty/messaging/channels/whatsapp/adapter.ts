import { PlatformType } from "../../../../../../generated/prisma/client.js";
import { WaTemplateStatus } from "../../../../../types/enums.js";
import { log } from "../../../../../utils/logger.js";
import prisma from "../../../../../utils/prisma.js";
import { sendFlow } from "../../../../whatsapp/flows/flow.service.js";
import { sendMetaMessage } from "../../../../whatsapp/meta/metaMessage.service.js";
import { sendTemplateToUserCore } from "../../../../whatsapp/messageTemplates/wa_templates.controller.js";
import { parsePhoneforWa } from "../../../util.js";
import { LoyaltyChannel as Channels } from "../../channelIds.js";
import { isTextDowngradable, renderTemplateAsText, renderTemplateBody } from "../../render.js";
import type {
  AcceptedPlan,
  DeliveryPlan,
  LoyaltyChannel,
  LoyaltyMessage,
  LoyaltySendMode,
} from "../../types.js";
import { sessionPayload } from "./payloads.js";
import { findOpenSession } from "./session.js";

/**
 * WhatsApp: free-form messages only inside the 24-hour window the customer opened, a Meta
 * template outside it. Inside the window a template's words go as plain text when the
 * programme prefers it (free, and fine before approval) — and so do a message's own words
 * when it has no template at all.
 */

type WhatsappDetail =
  | { kind: "session"; phoneId: string | null }
  | { kind: "template"; params: string[] }
  | { kind: "flow" };

interface StoredTemplate {
  components: unknown;
  status: string | undefined;
  phoneId: string | null;
}

async function loadTemplate(waTemplateId: string): Promise<StoredTemplate | null> {
  const row = await prisma.waTemplate.findUnique({
    where: { id: waTemplateId },
    select: { data: true, whatsappSettingsPhoneId: true },
  });
  if (!row) return null;
  const data = (row.data ?? {}) as { components?: unknown; status?: string };
  return { components: data.components, status: data.status, phoneId: row.whatsappSettingsPhoneId };
}

function richMode(message: LoyaltyMessage): LoyaltySendMode | null {
  const parts = message.parts;
  if (!parts) return null;
  if (parts.image) return "media";
  if (parts.flow || parts.list || parts.buttons || parts.cta) return "interactive";
  return null;
}

const accepted = (
  mode: LoyaltySendMode,
  text: string | null,
  templateId: string | null,
  detail: WhatsappDetail,
): DeliveryPlan => ({ ok: true, mode, text, templateId, detail });

const refused = (
  reason: Extract<DeliveryPlan, { ok: false }>["reason"],
  text: string | null,
  templateId: string | null,
): DeliveryPlan => ({ ok: false, reason, text, templateId });

/** `sendTemplateToUserCore` and friends answer `{ status: false }` on a refusal and little else otherwise. */
function acceptedBy(result: unknown): boolean {
  return !(
    result !== undefined &&
    result !== null &&
    typeof result === "object" &&
    "status" in result &&
    (result as { status?: unknown }).status === false
  );
}

export const whatsappChannel: LoyaltyChannel = {
  id: Channels.WHATSAPP,

  capabilities: {
    maxTextLength: 4096,
    replyButtons: { max: 3, titleMax: 20 },
    list: { maxRows: 10, titleMax: 24 },
    image: true,
    ctaUrl: true,
    flow: true,
    proactiveNeedsTemplate: true,
  },

  isReachable(recipient) {
    return recipient.phone ? true : "no_phone";
  },

  async plan(ctx, message) {
    const phone = ctx.recipient.phone!;
    const artefact = message.artefacts?.WHATSAPP;
    const template = artefact ? await loadTemplate(artefact.waTemplateId) : null;
    const templateId = template ? artefact!.waTemplateId : null;
    const params = artefact?.params ?? [];
    const templateText = template ? renderTemplateAsText(template.components, params) : null;
    const rich = richMode(message);

    const templateApproved = template?.status === WaTemplateStatus.APPROVED;
    const asTemplate = (): DeliveryPlan => {
      if (!template) return refused("no_template", message.text, null);
      if (!templateApproved) return refused("template_not_approved", templateText, templateId);
      return accepted(
        "template",
        renderTemplateBody(template.components, params) ?? templateText,
        templateId,
        { kind: "template", params },
      );
    };

    // The customer just wrote in: the window is open on the number they wrote to.
    if (ctx.reply) {
      const phoneId = ctx.reply.phoneId ?? template?.phoneId ?? null;
      if (rich === "interactive" && message.parts?.flow) {
        return accepted("interactive", message.text, null, { kind: "flow" });
      }
      if (rich) return accepted(rich, message.text, null, { kind: "session", phoneId });
      if (message.text?.trim()) {
        return accepted("text", message.text, null, { kind: "session", phoneId });
      }
      return asTemplate();
    }

    let session: { phoneId: string | null } | null | undefined;
    const openSession = async (phoneId?: string | null) => {
      if (session === undefined)
        session = await findOpenSession({ orgId: ctx.orgId, phone, phoneId });
      return session;
    };
    const preferText = ctx.program?.sendTextInSession ?? true;

    if (
      template &&
      preferText &&
      templateText !== null &&
      isTextDowngradable(template.components)
    ) {
      const open = await openSession(template.phoneId);
      if (open) {
        return accepted("text", templateText, templateId, {
          kind: "session",
          phoneId: template.phoneId ?? open.phoneId,
        });
      }
    }

    if (rich) {
      // A flow leaves from the flow's own number, so any open window will do.
      const open = await openSession(message.parts?.flow ? null : template?.phoneId);
      if (open) {
        if (message.parts?.flow)
          return accepted("interactive", message.text, null, { kind: "flow" });
        // A linked template's words win over the stored copy, as they do for plain text.
        const words = template ? renderTemplateBody(template.components, params) : null;
        return accepted(rich, words ?? message.text, templateId, {
          kind: "session",
          phoneId: template?.phoneId ?? open.phoneId,
        });
      }
      if (message.sessionOnly) return refused("session_closed", message.text, null);
    }

    if (template) return asTemplate();

    if ((preferText || message.sessionOnly) && message.text?.trim()) {
      const open = await openSession();
      if (open)
        return accepted("text", message.text, null, { kind: "session", phoneId: open.phoneId });
    }

    return refused(message.sessionOnly ? "session_closed" : "no_template", message.text, null);
  },

  async send(ctx, message, plan: AcceptedPlan) {
    const phone = parsePhoneforWa(ctx.recipient.phone!);
    const detail = plan.detail as WhatsappDetail;
    try {
      if (detail.kind === "template") {
        const artefact = message.artefacts!.WHATSAPP!;
        const result = await sendTemplateToUserCore(
          ctx.orgId,
          artefact.waTemplateId,
          phone,
          [
            {
              type: "body",
              // Strings: a non-string parameter is swapped for the template's sample value.
              parameters: detail.params.map((text) => ({ type: "text", text: String(text) })),
            },
          ] as Parameters<typeof sendTemplateToUserCore>[3],
          artefact.teamId,
          undefined,
          undefined,
          false,
          undefined,
          undefined,
          artefact.quickReplyPayload,
          false,
          artefact.flowContext,
        );
        const ok = acceptedBy(result);
        return {
          ok,
          messageId: ok ? ((result as { id?: string })?.id ?? undefined) : undefined,
          error: ok
            ? undefined
            : String((result as { message?: unknown })?.message ?? "send failed"),
        };
      }

      if (detail.kind === "flow") {
        const flow = message.parts!.flow!;
        const ok = await sendFlow({
          orgId: ctx.orgId,
          dbFlowId: flow.dbFlowId,
          phone,
          context: flow.context as Parameters<typeof sendFlow>[0]["context"],
        });
        return ok ? { ok } : { ok, error: "flow send failed" };
      }

      const result = await sendMetaMessage({
        platform: PlatformType.WHATSAPP,
        orgId: ctx.orgId,
        to: phone,
        payload: sessionPayload(phone, { ...message, text: plan.text }),
        sourceIdentifier: detail.phoneId ?? undefined,
        messageType: "AUTOMATED",
        isAutomated: true,
      });
      return { ok: result.ok, messageId: result.messageId, error: result.error };
    } catch (error) {
      // A conversation-limit refusal or a Graph error: reported, never thrown.
      log.error({ err: error, orgId: ctx.orgId, key: message.key }, "WhatsApp loyalty send failed");
      return { ok: false, error: error instanceof Error ? error.message : "send failed" };
    }
  },
};
