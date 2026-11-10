import { Prisma } from "../../generated/prisma/client.js";
import { ContactIdentityKind } from "../../generated/prisma/enums.js";

/**
 * Which platform a contact can be reached on is carried by the platform's own identifier —
 * an IG_SCOPED identity for Instagram, FB_PSID for Facebook Messenger — written when the contact first
 * messages in (see `wamessage.controller.ts`). `Contact.source` cannot stand in for it: it is a
 * free-form string, absent on older rows, and says "CSV IMPORT"/"external"/whatever a Zapier or
 * public-API caller sent for every contact that did not arrive through the inbox.
 *
 * A WhatsApp contact is therefore one carrying neither identifier. Note that a phone check is
 * no substitute either — older Instagram contacts stored their IGSID in `phone`.
 *
 * One `identities` key, so callers can spread it next to `orgId`/`AND` without clobbering.
 */
export const whatsappContactWhere = {
  identities: {
    none: { kind: { in: [ContactIdentityKind.IG_SCOPED, ContactIdentityKind.FB_PSID] } },
  },
} satisfies Prisma.ContactWhereInput;

/** Query value selecting the above, e.g. `GET /contact?channel=whatsapp`. */
export const WHATSAPP_CONTACT_CHANNEL = "whatsapp";
