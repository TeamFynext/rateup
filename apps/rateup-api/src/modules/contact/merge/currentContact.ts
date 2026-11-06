import prisma from "../../../utils/prisma.js";

/**
 * The contact an id stands for now. A merge deletes the source contact, but a client may
 * still hold its id — the webchat widget keeps its visitor's contact id in the browser —
 * so an id that no longer exists is followed through the merge audit to the contact it
 * was merged into (a few hops, for a contact merged more than once). Null when the id
 * names no contact of this org, now or before.
 */
export async function currentContactId(orgId: string, contactId: string): Promise<string | null> {
  let id = contactId;
  for (let hop = 0; hop < 5; hop++) {
    const exists = await prisma.contact.findFirst({ where: { id, orgId }, select: { id: true } });
    if (exists) return exists.id;
    const merge = await prisma.contactMerge.findFirst({
      where: { orgId, sourceContactId: id },
      orderBy: { createdAt: "desc" },
      select: { targetContactId: true },
    });
    if (!merge) return null;
    id = merge.targetContactId;
  }
  return null;
}
