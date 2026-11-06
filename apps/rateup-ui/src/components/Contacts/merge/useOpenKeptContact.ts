import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";

import { getContactById } from "@/backend/campaign/contacts/contacts.api";
import { contactKeys } from "@/backend/campaign/contacts/contacts.keys";
import { useContactTableStore } from "@/components/dashboard/contacts/store/contact-table-store.ts";

/**
 * After a merge on the contacts pages: opens the kept contact's detail dialog (rendered by
 * `ContactDetailHost`), so the person sees the result of what they just did.
 */
export function useOpenKeptContact() {
  const queryClient = useQueryClient();
  const setSelectedContact = useContactTableStore((state) => state.setSelectedContact);
  return useCallback(
    async (contactId: string) => {
      try {
        const contact = await queryClient.fetchQuery({
          queryKey: contactKeys.detail(contactId),
          queryFn: () => getContactById(contactId),
        });
        setSelectedContact(contact);
      } catch {
        // The merge itself succeeded and the list refetches; failing to open the
        // detail dialog is not worth an error toast.
      }
    },
    [queryClient, setSelectedContact],
  );
}
