import { WaTemplateStatus } from "../../../../types/enums.js";
import prisma from "../../../../utils/prisma.js";
import {
  contactFields,
  contactWhereIdentity,
  primaryIdentities,
  type PrimaryIdentityRow,
} from "../../../contact/identity/contactFields.js";
import { getTemplatesByOrgId } from "../../../whatsapp/messageTemplates/wa_templates.service.js";

/** The contact fields a platform's modules map from; the same set every contact action returns. */
export const AUTOMATION_CONTACT_FIELDS = [
  "id",
  "name",
  "phone",
  "email",
  "source",
  "igsId",
  "waMessageAssignStatus",
  "createdAt",
] as const;

/** The columns behind them; phone, email and igsId are the contact's primary identities. */
const AUTOMATION_CONTACT_SELECT = {
  id: true,
  name: true,
  source: true,
  waMessageAssignStatus: true,
  createdAt: true,
  ...primaryIdentities,
} as const;

/**
 * A contact as every contact action returns it, in the same key order. Takes a row with the
 * fields already mapped, or with its primary `identities` loaded.
 */
export function pickAutomationContact(contact: Record<string, unknown>) {
  const identities = contact.identities as PrimaryIdentityRow[] | undefined;
  const row = identities ? { ...contactFields(identities), ...contact } : contact;
  return Object.fromEntries(AUTOMATION_CONTACT_FIELDS.map((key) => [key, row[key] ?? null]));
}

/**
 * Contacts in the org with this phone (digits, `+` optional) or this email.
 * Exact matches, so a scenario's "find, else create" does not latch onto a
 * longer number that merely contains the one asked for.
 */
export async function searchAutomationContacts(
  orgId: string,
  query: { phone?: string; email?: string },
) {
  const rows = await prisma.contact.findMany({
    where: {
      orgId,
      OR: [
        ...(query.phone?.replace(/\D/g, "") ? [contactWhereIdentity("phone", query.phone)] : []),
        ...(query.email ? [contactWhereIdentity("email", query.email)] : []),
      ],
    },
    select: AUTOMATION_CONTACT_SELECT,
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  return rows.map(pickAutomationContact);
}

/** The highest `{{n}}` in a template's body: how many variables a send must fill. */
export function templateBodyVariableCount(
  components: readonly { type?: string; text?: string }[] = [],
) {
  const body = components.find((c) => c.type?.toUpperCase() === "BODY");
  const numbers = [...(body?.text ?? "").matchAll(/\{\{\s*(\d+)\s*\}\}/g)].map((m) => Number(m[1]));
  return numbers.length ? Math.max(...numbers) : 0;
}

/** The org's approved templates, for the template dropdown. */
export async function listAutomationTemplates(orgId: string) {
  const templates = await getTemplatesByOrgId(orgId);
  return templates
    .filter((t) => t.data?.status === WaTemplateStatus.APPROVED)
    .map((t) => ({
      id: t.id,
      name: t.data.name,
      language: t.data.language,
      variableCount: templateBodyVariableCount(t.data.components),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** The org's name, which the platform shows on the connection. */
export async function getAutomationOrg(orgId: string) {
  const org = await prisma.org.findUnique({ where: { id: orgId }, select: { name: true } });
  return { orgId, orgName: org?.name ?? null };
}
