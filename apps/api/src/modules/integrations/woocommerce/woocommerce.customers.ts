import type { Integration } from "../../../generated/prisma/client.js";
import prisma from "../../../utils/prisma.js";
import { ContactIdentitySource } from "../../../generated/prisma/enums.js";
import {
  contactFields,
  contactWhereIdentity,
  primaryIdentities,
  setPrimaryIdentities,
} from "../../contact/identity/contactFields.js";
import { IdentityTakenError } from "../../contact/identity/identity.service.js";
import { log } from "../../../utils/logger.js";
import { findLinkByExternalId, recordLink } from "../shared/entityLink.js";
import type { WooDeliveryJobData } from "./woocommerce.inbound.js";
import { toWooContact, type WooContact, type WooCustomerPayload } from "./woocommerce.mapping.js";
import { readWooCredential } from "./woocommerce.types.js";

/**
 * `customer.created` → a RateUp contact, when the admin has switched customer
 * sync on. One-way: RateUp never writes customers back.
 *
 * The number is the contact's identity, as everywhere in RateUp. A customer
 * whose number is already a contact is linked to it rather than duplicated —
 * a second contact on one number would split that person's inbox thread —
 * and only the name and email it lacks are filled in; nothing a person typed
 * in RateUp is overwritten by the store.
 */

export type WooCustomerOutcome =
  | "sync_off"
  | "no_id"
  | "no_phone"
  | "already_linked"
  | "linked"
  | "created";

const LINK = (integrationId: string) => ({ integrationId, entityType: "contact" as const });

const isUniqueViolation = (error: unknown) =>
  error instanceof IdentityTakenError || (error as { code?: string } | null)?.code === "P2002";

export async function handleWooCustomer(
  integration: Integration,
  data: WooDeliveryJobData,
): Promise<WooCustomerOutcome> {
  const credential = readWooCredential(integration.credential);
  if (!credential?.syncCustomers || !integration.orgId) return "sync_off";
  const orgId = integration.orgId;

  const contact = toWooContact(data.payload as WooCustomerPayload, credential);
  if ("skipped" in contact) {
    log.info(
      { integrationId: integration.id, reason: contact.skipped },
      "WooCommerce customer not synced",
    );
    return contact.skipped;
  }

  if (await findLinkByExternalId(LINK(integration.id), contact.externalId)) {
    return "already_linked";
  }

  const existing = await findContactByPhone(orgId, contact.phone);
  if (existing) {
    await fillMissing(orgId, existing, contact);
    await recordLink(LINK(integration.id), {
      rateupId: existing.id,
      externalId: contact.externalId,
    });
    return "linked";
  }

  // Loaded on use: contact creation reaches the automation engine and the
  // integration fan-out, which the registry importing this module has no need for.
  const { createContact } = await import("../../contact/contact.service.js");
  try {
    const created = await createContact({
      orgId,
      phone: contact.phone,
      // Blank rather than invented when the store has no name for them.
      name: contact.name ?? "",
      ...(contact.email && { email: contact.email }),
      source: "WooCommerce",
    });
    await recordLink(LINK(integration.id), {
      rateupId: created.id,
      externalId: contact.externalId,
    });
    return "created";
  } catch (error) {
    // Someone else — a WhatsApp message, an order, a retry — created this number
    // a moment ago. Theirs stands; link to it.
    if (!isUniqueViolation(error)) throw error;
    const raced = await findContactByPhone(orgId, contact.phone);
    if (!raced) throw error;
    await recordLink(LINK(integration.id), { rateupId: raced.id, externalId: contact.externalId });
    return "linked";
  }
}

async function findContactByPhone(orgId: string, phone: string) {
  const row = await prisma.contact.findFirst({
    where: { orgId, ...contactWhereIdentity("phone", phone) },
    select: { id: true, name: true, ...primaryIdentities },
  });
  return row && { id: row.id, name: row.name, email: contactFields(row.identities).email };
}

async function fillMissing(
  orgId: string,
  existing: { id: string; name: string | null; email: string | null },
  contact: WooContact,
) {
  if (!existing.name?.trim() && contact.name) {
    await prisma.contact.update({ where: { id: existing.id }, data: { name: contact.name } });
  }
  if (!existing.email?.trim() && contact.email) {
    await fillEmail(orgId, existing.id, contact.email);
  }
}

/** The store's email, unless another contact is already known by it. */
export async function fillEmail(orgId: string, contactId: string, email: string) {
  try {
    await setPrimaryIdentities(orgId, contactId, { email }, ContactIdentitySource.IMPORT);
  } catch (error) {
    if (!(error instanceof IdentityTakenError)) throw error;
    log.info({ contactId }, "WooCommerce email belongs to another contact; left off this one");
  }
}
