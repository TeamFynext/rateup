import { log } from "../../../../utils/logger.js";
import prisma from "../../../../utils/prisma.js";
import { notify } from "../../../notification/notify.js";

/**
 * A customer wrote in. The people handling the conversation hear about it; when nobody is,
 * everyone who can pick it up from the queue does — a first message from a new customer is
 * the one that must not be missed.
 */
export async function notifyInboundMessage(input: {
  orgId: string;
  contactId: string | null | undefined;
  contactName: string;
  sourceIdentifier: string | null | undefined;
}): Promise<void> {
  const { orgId, contactId, contactName } = input;
  if (!contactId) return;

  try {
    const assignees = await prisma.waInboxAssign.findMany({
      where: { contactId },
      select: { assignedUserId: true },
    });
    const data = { contactId, contactName };
    if (assignees.length > 0) {
      await notify({
        event: "inbox.message.assigned",
        orgId,
        audience: { kind: "users", userIds: assignees.map((a) => a.assignedUserId) },
        data,
      });
    } else {
      await notify({
        event: "inbox.message.unassigned",
        orgId,
        audience: { kind: "inboxQueue", sourceIdentifier: input.sourceIdentifier ?? null },
        data,
      });
    }
  } catch (error) {
    log.error({ err: error, orgId, contactId }, "Could not notify about an inbound message");
  }
}
