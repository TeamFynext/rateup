import prisma from "../../../utils/prisma.js";

/**
 * The digits Rateup stores. A `Contact.phone` holds an E.164 number with the
 * `+` stripped, so every lookup and every write has to agree on that shape.
 */
export function leadPhoneDigits(phone?: string | null) {
  return phone?.replace(/\D/g, "") || null;
}

/**
 * The contact behind a lead that was typed straight onto the board.
 *
 * A manually added lead carries a number but no `contactId`, which left the
 * customer known to the pipeline and unknown to the inbox — no thread, no
 * campaign membership, nothing to message. So the number now resolves to a
 * contact: the existing one if that person is already in the book, a new one if
 * they are not.
 *
 * Matching is suffix-based rather than exact, the same rule the Add-lead dialog's
 * own lookup uses: one side commonly carries the country code the other omits, and
 * an exact compare would answer "not found" and split the person in two. Numbers
 * with fewer than seven digits are neither matched nor created — a suffix that
 * short matches almost anything, and junk is not worth a contact record.
 *
 * Returns null when nothing can be linked, and the lead is opened contact-less
 * exactly as before. Whether the contact this hands back already holds a lead on
 * the board is not decided here — `createLead` refuses that for a named contact
 * and a resolved one alike.
 *
 * The database narrows on the subscriber number and the suffix rule decides,
 * rather than the rule being expressed as a query — `endsWith` is index-free
 * either way, and a handful of candidates is what an org's numbers collapse to.
 *
 * It lives here rather than in `lead.service` so that `contact.service` — which
 * that file already imports for the board's stage helpers — can be pulled in
 * dynamically without closing a module cycle.
 */
export async function resolveContactForLead(
  orgId: string,
  phone: string,
  name: string,
  email?: string | null,
  options: { quiet?: boolean } = {},
): Promise<{ contactId: string; created: boolean } | null> {
  const digits = leadPhoneDigits(phone);
  if (!digits || digits.length < 7) return null;

  // The last ten digits are the subscriber number for every market Rateup sells
  // in; anything shorter is matched whole.
  const national = digits.length > 10 ? digits.slice(-10) : digits;

  const candidates = await prisma.contact.findMany({
    where: { orgId, phone: { endsWith: national } },
    select: { id: true, phone: true },
    orderBy: { createdAt: "asc" },
  });

  const existing = candidates.find((candidate) => {
    const stored = leadPhoneDigits(candidate.phone);
    if (!stored || stored.length < 7) return false;
    return stored.endsWith(digits) || digits.endsWith(stored);
  });
  if (existing) return { contactId: existing.id, created: false };

  try {
    const { createContact } = await import("../../contact/contact.service.js");
    const contact = await createContact(
      {
        orgId,
        name,
        phone: digits,
        ...(email && { email }),
        // Free text on a contact, unlike `Lead.source`, so it can say where it
        // came from rather than which platform it arrived on.
        source: "Pipeline lead",
      },
      undefined,
      options,
    );
    return { contactId: contact.id, created: true };
  } catch (error) {
    // A lead the user asked for must not be lost because the contact book, or
    // one of the integration triggers a new contact fires, refused.
    console.error("Failed to create the contact behind a manually added lead", error);
    return null;
  }
}
