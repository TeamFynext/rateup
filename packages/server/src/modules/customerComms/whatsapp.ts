import { parsePhoneNumberFromString } from "libphonenumber-js";
import { PlatformType } from "../../generated/prisma/client.js";
import { WaTemplateCategory } from "../../types/enums.js";
import prisma from "../../utils/prisma.js";
import { log } from "../../utils/logger.js";

/** RateUp's own org on the platform: sends customer comms and receives the replies. */
export function senderOrgId(): string | undefined {
  return process.env.ROOT_ORG || undefined;
}

/** The quick-reply payload the "Stop updates" button is sent with. */
export const STOP_PAYLOAD = "RATEUP_STOP_UPDATES";

/** Digits Meta accepts, or null when the stored text is not a phone number. */
export function toWhatsappNumber(raw: string | null | undefined): string | null {
  if (!raw) return null;
  // Profile numbers typed without a +code are Indian far more often than not.
  const parsed = parsePhoneNumberFromString(raw, "IN");
  return parsed?.isValid() ? parsed.number.replace(/^\+/, "") : null;
}

interface TemplateComponent {
  type: string;
  text?: string;
  buttons?: { type: string; text: string }[];
}

/**
 * Sends one approved template from the sender org. Body variables are filled in order from
 * `vars` ({{1}} first), as many as the template's body has.
 */
export async function sendCustomerWhatsapp(to: string, templateName: string, vars: string[]) {
  const orgId = senderOrgId();
  if (!orgId) throw new Error("ROOT_ORG is not set");
  // Loaded on send: the inbox module opens Redis subscribers at import, and the staff API
  // (which imports this file for test sends) should not pay for that at boot.
  const [{ sendMessage }, { createTemplateMessage }] = await Promise.all([
    import("../whatsapp/whatsappSurvey/wasurvey.service.js"),
    import("../whatsapp/whatsappSurvey/wasurvey.utils.js"),
  ]);

  const template = await prisma.waTemplate.findFirst({
    where: { orgId, data: { path: ["name"], equals: templateName } },
    select: { data: true, whatsappSettingsPhoneId: true },
  });
  if (!template) throw new Error(`Template "${templateName}" not found in the sender org`);
  const data = template.data as unknown as {
    name: string;
    language: string;
    category?: string;
    components: TemplateComponent[];
  };

  const body = data.components.find((c) => c.type.toUpperCase() === "BODY");
  const slots = new Set(body?.text?.match(/\{\{\d+\}\}/g) ?? []).size;
  const components: object[] = [];
  if (slots) {
    components.push({
      type: "body",
      parameters: vars.slice(0, slots).map((text) => ({ type: "text", text })),
    });
  }
  const buttons = data.components.find((c) => c.type.toUpperCase() === "BUTTONS")?.buttons ?? [];
  buttons.forEach((button, index) => {
    if (button.type.toUpperCase() === "QUICK_REPLY" && /stop/i.test(button.text)) {
      components.push({
        type: "button",
        sub_type: "quick_reply",
        index,
        parameters: [{ type: "payload", payload: STOP_PAYLOAD }],
      });
    }
  });

  const team = await prisma.team.findFirst({
    where: { orgId },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  const message = createTemplateMessage(to, {
    name: data.name,
    language: { code: data.language },
    components,
  } as Parameters<typeof createTemplateMessage>[1]);

  await sendMessage(
    orgId,
    message,
    undefined,
    undefined,
    template.whatsappSettingsPhoneId ?? undefined,
    PlatformType.WHATSAPP,
    data.category === WaTemplateCategory.MARKETING ? WaTemplateCategory.MARKETING : undefined,
    team?.id ?? null,
    "TEMPLATE",
    true,
    false,
    // RateUp's own plan allowance must never stop a message to a customer.
    true,
  );
}

/**
 * "Stop updates" from someone on RateUp's own number. Matched on the number's last ten
 * digits, since User.phone is free text that may or may not carry the country code.
 */
export async function optOutWhatsappByPhone(from: string): Promise<number> {
  const tail = from.replace(/\D/g, "").slice(-10);
  if (tail.length < 8) return 0;
  const rows = await prisma.$queryRaw<{ id: string }[]>`
    SELECT u.id FROM "User" u
    WHERE right(regexp_replace(coalesce(u.phone, ''), '\\D', '', 'g'), 10) = ${tail}
    UNION
    SELECT o."ownerId" FROM "Org" o
    WHERE right(regexp_replace(coalesce(o.phone, ''), '\\D', '', 'g'), 10) = ${tail}`;
  if (!rows.length) return 0;
  const { count } = await prisma.user.updateMany({
    where: { id: { in: rows.map((r) => r.id) } },
    data: { marketingWhatsappOptOutAt: new Date() },
  });
  log.info({ count }, "customer comms: WhatsApp opt-out by reply");
  return count;
}

/**
 * Inbound hook for every WhatsApp message: on RateUp's own number, a "Stop updates" tap or a
 * bare STOP opts the sender out. The message still reaches the inbox like any other.
 */
export async function handleSenderOrgStop(
  orgId: string,
  from: string,
  parsed: { buttonPayload?: string; message?: string },
): Promise<void> {
  if (!from || orgId !== senderOrgId()) return;
  const text = parsed.message?.trim().toLowerCase();
  if (parsed.buttonPayload === STOP_PAYLOAD || text === "stop" || text === "stop updates") {
    await optOutWhatsappByPhone(from);
  }
}
