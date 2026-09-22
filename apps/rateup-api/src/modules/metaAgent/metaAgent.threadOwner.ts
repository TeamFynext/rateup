import { MetaAgentThreadOwner } from "../../../generated/prisma/client.js";
import prisma from "../../utils/prisma.js";
import { log } from "../../utils/logger.js";
import { sendViaWstoOrgHandler } from "../org/ws/org.ws.controller.js";

/**
 * Who is answering a customer when the Meta Business Agent (Meta AI) is set up.
 *
 * Meta never tells us the state outright, only transitions, so it is pieced
 * together from every signal that implies one:
 *
 * - `messaging_handovers` — the explicit transition (`control_passed`,
 *   `control_taken`). See `resolveHandoverOwner`.
 * - `standby` traffic — Meta only routes a thread there while the agent holds it.
 * - A staff reply from the inbox — sending takes the thread back from the agent.
 * - Our own `release` call — hands it back to the agent.
 *
 * Each write carries the moment it describes and only lands if it is not older
 * than the stored one, so a webhook Meta delivers late cannot undo a newer state.
 */

/** A `messaging_handovers` change value. Meta only documents part of it. */
export interface WaMessagingHandoverValue {
  messaging_product?: "whatsapp";
  metadata?: { display_phone_number?: string; phone_number_id?: string };
  recipient?: { display_phone_number?: string; phone_number_id?: string };
  sender?: { phone_number?: string };
  timestamp?: string;
  type?: string;
  control_passed?: HandoverDetail;
  control_taken?: HandoverDetail;
}

interface HandoverDetail {
  previous_owner_app_id?: string;
  previous_owner_app_role?: string;
  previous_owner_role?: string;
  new_owner_app_id?: string;
  new_owner_role?: string;
  metadata?: string;
}

/**
 * The owner a handover leaves the thread with, or null when the payload does not
 * say. Roles win when present (`ai_agent` is Meta AI; `escalation` and anything
 * else is a person). `control_taken` names apps instead: our own app taking the
 * thread means staff, any other app taking it means the agent.
 */
export function resolveHandoverOwner(
  value: WaMessagingHandoverValue,
): { owner: MetaAgentThreadOwner; reason: string | null } | null {
  const detail = value.control_passed ?? value.control_taken;
  if (!detail) return null;
  const reason = detail.metadata?.trim() || null;

  if (detail.new_owner_role) {
    const owner =
      detail.new_owner_role === "ai_agent" ? MetaAgentThreadOwner.AI : MetaAgentThreadOwner.STAFF;
    return { owner, reason };
  }

  const ourAppId = process.env.waclient_id;
  if (detail.new_owner_app_id && ourAppId) {
    const owner =
      detail.new_owner_app_id === ourAppId ? MetaAgentThreadOwner.STAFF : MetaAgentThreadOwner.AI;
    return { owner, reason };
  }

  return null;
}

/** Meta's epoch-seconds timestamp, or now when it is missing or unreadable. */
export function metaTimestampToDate(timestamp: string | number | undefined): Date {
  const seconds = Number(timestamp);
  return Number.isFinite(seconds) && seconds > 0 ? new Date(seconds * 1000) : new Date();
}

/**
 * Records who holds `phone`'s thread and tells the inbox. A no-op, with no
 * broadcast, when the contact already has that owner or holds a newer state.
 */
export async function setMetaAgentThreadOwner(input: {
  orgId: string;
  phone: string;
  owner: MetaAgentThreadOwner;
  reason?: string | null;
  at?: Date;
}): Promise<boolean> {
  const { orgId, phone, owner } = input;
  const at = input.at ?? new Date();
  const reason = input.reason ?? null;
  if (!phone) return false;

  const { count } = await prisma.contact.updateMany({
    where: {
      orgId,
      phone,
      AND: [
        { OR: [{ metaAgentThreadOwner: null }, { metaAgentThreadOwner: { not: owner } }] },
        { OR: [{ metaAgentThreadOwnerAt: null }, { metaAgentThreadOwnerAt: { lte: at } }] },
      ],
    },
    data: {
      metaAgentThreadOwner: owner,
      metaAgentThreadOwnerAt: at,
      metaAgentHandoverReason: reason,
    },
  });
  if (count === 0) return false;

  const contact = await prisma.contact.findUnique({
    where: { contact_phone_org_id_unique: { phone, orgId } },
    select: { id: true },
  });
  if (!contact) return true;

  log.info({ orgId, contactId: contact.id, owner, reason }, "Meta AI thread owner changed");
  await sendViaWstoOrgHandler(
    orgId,
    {
      type: "meta_agent_thread",
      meta_agent_thread: {
        contactId: contact.id,
        owner,
        reason,
        at: at.toISOString(),
      },
    },
    "main",
  );
  return true;
}
