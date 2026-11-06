import type { QueryClient } from "@tanstack/react-query";

import { getContactById } from "@/backend/campaign/contacts/contacts.api";
import { contactKeys } from "@/backend/campaign/contacts/contacts.keys";
import { invalidateAfterMerge } from "@/backend/campaign/contacts/merge.query";

import { useContactsStore, type ContactWithUpdatedAt } from "./inbox.store.ts";

/** The contact-level fields a merge can change; ticket fields on a row are left alone. */
function contactFieldsOf(contact: ContactsData): Partial<ContactWithUpdatedAt> {
  return {
    id: contact.id,
    name: contact.name,
    phone: contact.phone,
    email: contact.email,
    bsuid: contact.bsuid,
    whatsappUserName: contact.whatsappUserName,
    igsId: contact.igsId,
    psid: contact.psid,
    profilePic: contact.profilePic,
    blockedOnWhatsApp: contact.blockedOnWhatsApp,
    consent: contact.consent,
    createdAt: contact.createdAt,
  };
}

/**
 * Applies a contact merge to the inbox: the source contact's rows leave every list (its
 * tickets now belong to the target and come back under it on the refetch), and an open
 * thread on either contact is re-pointed at the kept one without leaving the ticket.
 *
 * Runs for the `contact_merged` socket event and after a merge made in this tab.
 */
export async function applyContactMerged(
  queryClient: QueryClient,
  { sourceContactId, targetContactId }: { sourceContactId: string; targetContactId: string },
): Promise<void> {
  const store = useContactsStore.getState();
  const open = store.selectedContact;
  const openWasMerged = open?.id === sourceContactId || open?.id === targetContactId;

  await store.deleteContactsByIds([sourceContactId]);
  invalidateAfterMerge(queryClient, { sourceId: sourceContactId, targetId: targetContactId });

  if (!open || !openWasMerged) return;
  try {
    const target = await queryClient.fetchQuery({
      queryKey: contactKeys.detail(targetContactId),
      queryFn: () => getContactById(targetContactId),
    });
    // The open ticket moved with the merge, so its conversation id still holds.
    useContactsStore.getState().setSelectedContact({
      ...open,
      ...contactFieldsOf(target),
      updatedAt: new Date().toISOString(),
    });
  } catch {
    // The kept contact could not be read; the list refetch still shows it.
    if (open.id === sourceContactId) useContactsStore.getState().setSelectedContact(null);
  }
}
