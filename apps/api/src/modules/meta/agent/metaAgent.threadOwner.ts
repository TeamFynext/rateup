import { MetaAgentThreadOwner } from "../../../generated/prisma/client.js";
import { isBsuid } from "../whatsapp/bsuid.js";
import prisma from "../../../utils/prisma.js";
import { contactWhereIdentity } from "../../contacts/identity/contactFields.js";
import { log } from "../../../utils/logger.js";
import { sendViaWstoOrgHandler } from "../../settings/org/ws/org.ws.controller.js";
import { notify } from "../../settings/notifications/notify.js";

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
  /**
   * The customer. `user_id` (their BSUID) is not in Meta's handover docs yet but
   * every other webhook gained it alongside the phone, so it is read when present.
   */
  sender?: { phone_number?: string; user_id?: string };
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
 * Records who holds the customer's thread and tells the inbox. A no-op, with no
 * broadcast, when the contact already has that owner or holds a newer state.
 */
export async function setMetaAgentThreadOwner(input: {
  orgId: string;
  /** The customer's phone, or their BSUID when Meta withheld the phone. */
  phone?: string;
  /** The customer's BSUID, when known alongside the phone. */
  bsuid?: string;
  owner: MetaAgentThreadOwner;
  reason?: string | null;
  at?: Date;
  /**
   * Guessed from traffic rather than reported by Meta (standby messages).
   * A guess never overrides a report from the same moment: when the agent
   * hands over, the customer's message and the handover share a timestamp.
   */
  inferred?: boolean;
}): Promise<boolean> {
  const { orgId, owner } = input;
  const at = input.at ?? new Date();
  const reason = input.reason ?? null;
  const phone = isBsuid(input.phone) ? undefined : input.phone;
  const bsuid = input.bsuid ?? (isBsuid(input.phone) ? input.phone : undefined);
  const customer = [
    ...(phone ? [contactWhereIdentity("phone", phone)] : []),
    ...(bsuid ? [contactWhereIdentity("bsuid", bsuid)] : []),
  ];
  if (!customer.length) return false;

  const { count } = await prisma.contact.updateMany({
    where: {
      orgId,
      AND: [
        { OR: customer },
        { OR: [{ metaAgentThreadOwner: null }, { metaAgentThreadOwner: { not: owner } }] },
        {
          OR: [
            { metaAgentThreadOwnerAt: null },
            { metaAgentThreadOwnerAt: input.inferred ? { lt: at } : { lte: at } },
          ],
        },
      ],
    },
    data: {
      metaAgentThreadOwner: owner,
      metaAgentThreadOwnerAt: at,
      metaAgentHandoverReason: reason,
    },
  });
  if (count === 0) return false;

  const contact = await prisma.contact.findFirst({
    where: { orgId, OR: customer },
    select: { id: true, name: true },
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

  // A staff reply takes the thread itself, so only Meta's own handover asks for a person.
  if (owner === MetaAgentThreadOwner.STAFF && reason !== "staff_reply") {
    const assignees = await prisma.waInboxAssign.findMany({
      where: { contactId: contact.id },
      select: { assignedUserId: true },
    });
    await notify({
      event: "inbox.handover",
      orgId,
      audience:
        assignees.length > 0
          ? { kind: "users", userIds: assignees.map((a) => a.assignedUserId) }
          : { kind: "inboxQueue", sourceIdentifier: null },
      data: { contactId: contact.id, contactName: contact.name ?? phone ?? "WhatsApp user" },
    });
  }
  return true;
}
