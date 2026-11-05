import { axiosClient } from "../apiClient";

/** Why a WhatsApp number cannot message a contact. */
export type WhatsappUnreachableReason =
  /** The contact has neither a phone number nor a business-scoped user ID (BSUID). */
  | "NO_WHATSAPP"
  /** Known only by BSUIDs, none of them issued by this number's business. */
  | "OTHER_BUSINESS";

interface WhatsappReachBase {
  channelId: string;
  whatsappSettingsId: string | null;
  /** The number's Meta phone number id — what the composer's number picker selects by. */
  phoneId: string | null;
  /** The org's own name for the number. */
  name: string | null;
  /** The business number itself. */
  channelAddress: string | null;
  businessPortfolioId: string | null;
  businessName: string | null;
}

/**
 * Whether one of the org's WhatsApp numbers can message a contact. A phone number reaches
 * the customer from any number; a business-scoped user ID (BSUID) only from numbers of the
 * business that issued it.
 */
export type WhatsappReach = WhatsappReachBase &
  (
    | {
        reachable: true;
        /** The customer's address from this number: their phone, or that business's BSUID. */
        address: string;
        via: "phone" | "bsuid" | "unknown_business";
      }
    | { reachable: false; reason: WhatsappUnreachableReason }
  );

/** One row per WhatsApp number of the org. */
export const getWhatsappReach = async (contactId: string): Promise<WhatsappReach[]> => {
  const res = await axiosClient.get<WhatsappReach[]>(
    `/contact/identities/${contactId}/whatsapp-reach`,
  );
  return res.data;
};
