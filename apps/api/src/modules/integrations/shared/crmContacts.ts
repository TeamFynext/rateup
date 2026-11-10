import { ContactIdentityKind, ContactIdentitySource } from "../../../generated/prisma/enums.js";
import prisma from "../../../utils/prisma.js";
import {
  contactWhereIdentity,
  primaryIdentities,
  setPrimaryIdentities,
  withContactFields,
} from "../../contacts/identity/contactFields.js";
import { findContactIdByIdentity } from "../../contacts/identity/identity.service.js";
import { noteContactSelect, toNoteContact } from "./activityNotes.js";

/**
 * Contact reads and writes the CRM syncs (HubSpot, Pipedrive) share. A contact's phone and
 * email are its primary identities, so they are matched and written through those.
 */

/** The org's contact with this phone or email, as a `NoteContact`. */
export async function findCrmContact(
  orgId: string,
  field: "phone" | "email",
  value: string | null | undefined,
) {
  if (!value) return null;
  const row = await prisma.contact.findFirst({
    where: { orgId, ...contactWhereIdentity(field, value) },
    select: noteContactSelect,
  });
  return row && toNoteContact(row);
}

/** Whether another contact of the org is known by this phone or email. */
export async function heldByAnotherContact(
  orgId: string,
  contactId: string,
  field: "phone" | "email",
  value: string,
) {
  const kind = field === "phone" ? ContactIdentityKind.PHONE : ContactIdentityKind.EMAIL;
  const owner = await findContactIdByIdentity(orgId, kind, value);
  return Boolean(owner && owner !== contactId);
}

/** Writes a CRM's name, email and phone onto the contact; the full row back, for the event. */
export async function updateContactFromCrm(
  orgId: string,
  contactId: string,
  { name, email, phone }: { name?: string; email?: string; phone?: string },
) {
  const row = await prisma.$transaction(async (tx) => {
    await setPrimaryIdentities(
      orgId,
      contactId,
      { email, phone },
      ContactIdentitySource.IMPORT,
      tx,
    );
    return tx.contact.update({
      where: { id: contactId },
      data: { ...(name !== undefined && { name }) },
      include: primaryIdentities,
    });
  });
  return withContactFields(row);
}
