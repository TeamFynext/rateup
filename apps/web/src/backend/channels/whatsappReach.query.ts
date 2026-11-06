import { useQuery } from "@tanstack/react-query";

import { getContactWaAddress } from "@/utils/whatsapp/inbox.ts";

import { getWhatsappReach } from "./whatsappReach.api";

export const whatsappReachKeys = {
  all: () => ["whatsapp-reach"] as const,
  forContact: (contactId: string | undefined) => ["whatsapp-reach", contactId] as const,
} as const;

/**
 * Which of the org's WhatsApp numbers can message this contact, and at which address.
 * Changes only when the contact gains an identity or the org a number, so it is cached
 * for a while and refetched when either is invalidated.
 */
export const useWhatsappReach = (contactId: string | undefined, enabled = true) =>
  useQuery({
    queryKey: whatsappReachKeys.forContact(contactId),
    queryFn: () => getWhatsappReach(contactId ?? ""),
    enabled: enabled && Boolean(contactId),
    staleTime: 1000 * 60,
  });

/**
 * Where a WhatsApp send from `phoneId` reaches this contact: the address that number's
 * reach row names (a merged contact can hold one BSUID per business), else the
 * contact's own phone or BSUID while reach is loading or unavailable.
 */
export const useWhatsappSendAddress = (
  contact: { id?: string; phone?: string | null; bsuid?: string | null } | null | undefined,
  phoneId: string | undefined,
  enabled = true,
): string | undefined => {
  const { data: reach } = useWhatsappReach(contact?.id, enabled);
  const row = reach?.find((entry) => entry.phoneId === phoneId);
  if (row?.reachable) return row.address;
  return getContactWaAddress(contact);
};
