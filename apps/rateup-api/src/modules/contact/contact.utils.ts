import { ContactGroupType } from "./contactGroup/contactGroup.schema.js";
import { log } from "../../utils/logger.js";
import prisma from "../../utils/prisma.js";
import { SubscriptionFeaturePathName } from "../../types/enums.js";
import { parsePhoneforWa } from "../loyalty/util.js";
import { updateMonthlyStat } from "../stats/stats.service.js";
import { sendTemplateToUserCore } from "../whatsapp/messageTemplates/wa_templates.controller.js";

/**
 * Keeps the dashboard's loyalty-customer figure honest.
 *
 * `UsageStats.loyaltyCustomerCount` is an incremental counter that drifts, and a
 * registration is the moment there is a real count in hand to reconcile it against. This
 * is all that remains of a registration LIMIT that used to sit on the same route: it read
 * `whatsapp.count.max`, a path no tier defines, so it never refused anything, and the
 * plans do not cap loyalty registrations. Counting is bookkeeping; the refusal is gone.
 */
export async function reconcileLoyaltyCustomerCount(orgId: string) {
  const [count, usageStats] = await Promise.all([
    prisma.customerLoyaltyAccount.count({
      where: { contact: { orgId, source: "loyalty_program" } },
    }),
    prisma.usageStats.findUnique({ where: { orgId }, select: { loyaltyCustomerCount: true } }),
  ]);

  if (usageStats && usageStats.loyaltyCustomerCount !== count) {
    await prisma.usageStats.update({ where: { orgId }, data: { loyaltyCustomerCount: count } });
  }
}

/** The contact fields a loyalty-customer registration supplies. */
interface CreateLCustomerInput {
  phone?: string;
  orgId: string;
  name?: string | null;
  dob?: string | Date | null;
  email?: string | null;
  external_id?: string | null;
  source?: string | null;
  customFields?: Array<{ id?: string; value: string }>;
  [field: string]: unknown;
}

export async function createLCustomer(input: CreateLCustomerInput) {
  // The contact is keyed by phone, so it cannot be created without one. Callers
  // validate the number first; this guards rather than passing `undefined` to the key.
  if (!input.phone) {
    throw new Error("A loyalty customer cannot be created without a phone number");
  }
  const phone = parsePhoneforWa(input.phone);
  const contact = await prisma.contact.upsert({
    where: {
      contact_phone_org_id_unique: {
        phone,
        orgId: input.orgId,
      },
    },
    update: {
      source: ContactGroupType.LOYALTY,
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.email !== undefined ? { email: input.email } : {}),
      ...(input.external_id !== undefined ? { external_id: input.external_id } : {}),
      ...(input.dob !== undefined ? { dob: input.dob ?? null } : {}),
      // loyaltyAccounts: {
      //   create: {
      //     // orgId: input.orgId,

      //   },
      // },
    },
    create: {
      phone,
      name: input.name,
      source: ContactGroupType.LOYALTY,
      orgId: input.orgId,
      dob: input.dob ?? null,
      email: input.email,
      external_id: input.external_id,
      // loyaltyCustomer: {
      //   create: {
      //     orgId: input.orgId,
      //   },
      // },
    },
    // include: {
    //   loyaltyCustomer: true,
    // },
  });
  if (input.customFields?.length) {
    await prisma.contactCustomFieldValue.deleteMany({
      where: {
        contactId: contact?.id,
      },
    });
    await prisma.contactCustomFieldValue.createMany({
      data: input.customFields
        .filter((field): field is { id: string; value: string } => Boolean(field.id))
        .map((field) => ({
          contactId: contact?.id,
          fieldId: field.id,
          value: field.value,
        })),
      skipDuplicates: true,
    });
  }
  await updateMonthlyStat(SubscriptionFeaturePathName.Whatsapp, input.orgId);
  // Where the count used to be reconciled — the registration gate ran on this same route.
  // Moved into the registration itself now that the gate is gone.
  await reconcileLoyaltyCustomerCount(input.orgId);

  // const customer = contact.loyaltyCustomer;
  return {
    // ...customer,
    id: contact.id,
    name: contact.name,
    phone: contact.phone,
    email: contact?.email,
    dob: contact?.dob,
  };
}

export async function handlePostRegisterAction(_orgId: string, _customerId: string) {
  return;
}

export async function handleSendTemplate(
  waTemplateId: string | null | undefined,
  orgId: string,
  phone: string,
  dynamicVariables: unknown[],
) {
  if (!waTemplateId) {
    log.trace("No template Id found");
    return;
  }
  const components = [];
  components.push({
    type: "body",
    parameters: dynamicVariables.map((data) => ({
      type: "text",
      text: data,
    })),
  });
  await sendTemplateToUserCore(
    orgId,
    waTemplateId,
    phone,
    components,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
  );
}
