import { MetaAgentThreadOwner } from "../../../generated/prisma/client.js";
import prisma from "../../utils/prisma.js";
import { log } from "../../utils/logger.js";
import { setThreadControl } from "./metaAgent.service.js";

const digits = (value: string | null | undefined) => (value ?? "").replace(/\D/g, "");

/**
 * Hands threads back to Meta AI when their tickets close, for numbers whose
 * agent has `releaseOnTicketClose` on. Meta has no timeout of its own: a thread
 * escalated to staff stays silent on the AI side until someone releases it, so a
 * ticket closed without that click would leave the customer with no AI reply.
 *
 * Only contacts staff currently hold are touched, and spam contacts never are —
 * handing a spammer to the agent only spends AI replies on them. A failed
 * release is logged and left: the close itself has already happened, and the
 * inbox badge still reads "Staff", so someone can hand it back by hand.
 */
export async function releaseThreadsOnTicketClose(orgId: string, contactIds: string[]) {
  if (contactIds.length === 0) return;

  const contacts = await prisma.contact.findMany({
    where: {
      orgId,
      id: { in: contactIds },
      metaAgentThreadOwner: MetaAgentThreadOwner.STAFF,
      isSpam: false,
      phone: { not: null },
    },
    select: {
      id: true,
      phone: true,
      lastReceivedMetadata: true,
      lastMessageSourceIdentifier: true,
    },
  });
  if (contacts.length === 0) return;

  const agents = await prisma.metaBusinessAgent.findMany({
    where: { orgId, status: "ONBOARDED", releaseOnTicketClose: true },
    select: {
      whatsappSettingsId: true,
      whatsappSettings: { select: { phoneId: true, phone: true } },
    },
  });
  if (agents.length === 0) return;

  for (const contact of contacts) {
    // The thread belongs to the business number the customer wrote to: Meta's
    // phone id from their last message first, then the channel number.
    const phoneId = (contact.lastReceivedMetadata as { phone_number_id?: string } | null)
      ?.phone_number_id;
    const channel = digits(contact.lastMessageSourceIdentifier);
    const agent =
      agents.find((a) => phoneId && a.whatsappSettings.phoneId === phoneId) ??
      agents.find((a) => channel && digits(a.whatsappSettings.phone) === channel) ??
      // Guessing is only safe when nothing names the customer's number at all;
      // otherwise they are on a number without the agent.
      (!phoneId && !channel && agents.length === 1 ? agents[0] : undefined);
    if (!agent) continue;

    try {
      await setThreadControl(
        orgId,
        agent.whatsappSettingsId,
        { action: "release", to: `+${digits(contact.phone)}` },
        "ticket_closed",
      );
    } catch (error) {
      log.error(
        { err: error, orgId, contactId: contact.id },
        "Could not hand a closed ticket's thread back to Meta AI",
      );
    }
  }
}
