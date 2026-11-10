import {
  type ContactFields,
  contactFields,
  primaryIdentities,
  type PrimaryIdentityRow,
  withContactFields,
} from "../contact/identity/contactFields.js";

/** `contact: true` on a loyalty account, plus the identities its phone/email are read from. */
export const memberContactInclude = { include: primaryIdentities } as const;

interface WithIdentities {
  identities?: readonly PrimaryIdentityRow[];
}

/** A row loaded with its contact's `primaryIdentities`, with phone/email/... put back on the contact. */
export function withMemberContact<T extends { contact: WithIdentities }>(
  row: T,
): Omit<T, "contact"> & { contact: Omit<T["contact"], "identities"> & ContactFields } {
  return { ...row, contact: withContactFields(row.contact) };
}

/** The same, for a contact that used to select only `phone` and `email`: adds just those two. */
export function withMemberPhoneEmail<T extends { contact: WithIdentities }>(
  row: T,
): Omit<T, "contact"> & {
  contact: Omit<T["contact"], "identities"> & Pick<ContactFields, "phone" | "email">;
} {
  const { identities, ...contact } = row.contact;
  const { phone, email } = contactFields(identities);
  return { ...row, contact: { ...contact, phone, email } } as never;
}
