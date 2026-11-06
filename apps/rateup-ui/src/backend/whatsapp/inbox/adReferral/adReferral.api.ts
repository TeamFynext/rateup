import { useQuery } from "@tanstack/react-query";

import { axiosClient } from "../../../apiClient";
import { WA_INBOX_BASE_PATH } from "../index.ts";

/** Mirrors rateup-api's inbox/adReferral/adReferral.route.ts. */
export interface ContactAdReferral {
  id: string;
  conversationId: string | null;
  sourceId: string;
  sourceType: "ad" | "post" | (string & {});
  sourceUrl: string | null;
  headline: string | null;
  body: string | null;
  mediaType: string | null;
  mediaUrl: string | null;
  createdAt: string;
}

export const getContactAdReferrals = async (contactId: string) =>
  (await axiosClient.get<ContactAdReferral[]>(`${WA_INBOX_BASE_PATH}/ad-referrals/${contactId}`))
    .data;

export const useContactAdReferrals = (contactId: string) =>
  useQuery({
    queryKey: ["inbox", "ad-referrals", contactId],
    queryFn: () => getContactAdReferrals(contactId),
    staleTime: 60_000,
  });
