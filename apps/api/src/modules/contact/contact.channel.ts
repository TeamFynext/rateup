import { Prisma } from "../../../generated/prisma/client.js";

/**
 * Which platform a contact can be reached on is carried by the platform's own identifier —
 * `igsId` for Instagram, `psid` for Facebook Messenger — written when the contact first
 * messages in (see `wamessage.controller.ts`). `Contact.source` cannot stand in for it: it is a
 * free-form string, absent on older rows, and says "CSV IMPORT"/"external"/whatever a Zapier or
 * public-API caller sent for every contact that did not arrive through the inbox.
 *
 * A WhatsApp contact is therefore one carrying neither identifier. Note that a phone check is
 * no substitute either — Instagram contacts store their IGSID in `phone`.
 */
export const whatsappContactWhere = {
  psid: null,
  igsId: null,
} satisfies Prisma.ContactWhereInput;

/** Query value selecting the above, e.g. `GET /contact?channel=whatsapp`. */
export const WHATSAPP_CONTACT_CHANNEL = "whatsapp";
