import { FastifyReply, FastifyRequest } from "fastify";
import { ContactCore } from "./contact.schema.js";
import { ContactGroupType } from "./contactGroup/contactGroup.schema.js";
import { log } from "../../utils/logger.js";
import prisma from "../../utils/prisma.js";
import { getNestedProperty } from "../../utils/misc/obj.utils.js";
import { SubscriptionFeaturePathName } from "../../types/enums.js";
import { parsePhoneforWa } from "../loyalty/util.js";
import { updateMonthlyStat } from "../stats/stats.service.js";
import { sendTemplateToUserCore } from "../whatsapp/messageTemplates/wa_templates.controller.js";

/**
 * The loyalty registration cap, on POST /api/contact.
 *
 * Its entire body was commented out behind a "TODO: re-check", so it was an empty
 * async function registered as a preHandler — a gate that looked like a plan limit
 * and enforced nothing, while the working implementation sat directly beneath it
 * with no callers. See issues.txt 18.21.
 *
 * Wired up rather than deleted, unlike the four dead MESSAGE-limit gates
 * (issues.txt 14.1a, 17.1, 17.10). This is a different meter — the plan's maximum
 * number of loyalty customers — and it was not superseded by anything. Enabling it
 * changes nothing today, because no plan in subscription.data.ts states a
 * `whatsapp.count.max`, so verifyLCustomerMaxCountRestriction reports "no limit"
 * for every real subscription; a plan that DOES name one is enforced the moment it
 * exists.
 */
export async function verifyLCustomerMaxCountRestrictionHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  // Typed as a plain FastifyRequest so it composes with the route's zod-inferred
  // body; the two fields it reads are narrowed here instead.
  const body = (request.body ?? {}) as { orgId?: string } & Partial<ContactCore>;
  if (body.source !== ContactGroupType.LOYALTY) return;
  const orgId = body.orgId ?? request.user.orgId;
  if (!(await verifyLCustomerMaxCountRestriction(orgId, request.subscription))) {
    return reply.code(403).send({
      message: "Registration limit reached",
      displayMessageInClient: true,
    });
  }
}
export async function verifyLCustomerMaxCountRestriction(
  orgId: string,
  subscription: { features: unknown } | null | undefined,
) {
  if (!subscription) {
    log.trace("Subscription not found");
    return false;
  }
  const count = await prisma.customerLoyaltyAccount.count({
    where: {
      contact: {
        orgId,
        source: "loyalty_program",
      },
    },
  });

  // An org with no usage row yet has simply never had one written; the counter is
  // refreshed below either way. This used to throw a TypeError — which was fine
  // while nothing called the function (18.21) and would have been a 500 on every
  // registration the moment it was wired up. See issues.txt 18.22.
  const usageStats = await prisma.usageStats.findUnique({
    where: {
      orgId,
    },
    select: {
      loyaltyCustomerCount: true,
    },
  });

  if (usageStats && usageStats.loyaltyCustomerCount !== count)
    await prisma.usageStats.update({
      where: {
        orgId,
      },
      data: {
        loyaltyCustomerCount: count,
      },
    });

  // A plan that names no maximum means NO LIMIT — the same reading as
  // enforceWhatsappCountLimit, which is the shared version of the same gate for
  // flows, templates, campaigns and automated replies (issues.txt 11.7, 14.7,
  // 17.2). A plan with no whatsapp feature at all means the same thing; reading
  // `.count.max` off that undefined used to be a TypeError.
  // See issues.txt 18.22.
  const whatsappFeature = getNestedProperty<{ count?: { max?: number } }>(
    subscription.features as unknown as object,
    SubscriptionFeaturePathName.Whatsapp,
  );
  const max = whatsappFeature?.count?.max;
  if (max === undefined) return true;

  return count < max;
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
    // Only the fields the payload actually carries. name, email and external_id
    // used to be assigned unconditionally, so an existing contact who registered
    // again through a form that omits email had their stored email overwritten
    // with undefined — and the registration form is the least trustworthy source
    // of contact data in the system. dob keeps its `?? null` because clearing a
    // date of birth is a thing a re-registration legitimately does.
    // See issues.txt 18.23.
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

/**
 * Post-registration actions — award points, send a follow-up — are NOT implemented.
 *
 * This was a fully commented-out body, so a loyalty program configured with
 * register actions ran none of them and reported success. Left as an explicit
 * no-op with this note rather than as commented code, because the commented
 * version referenced a `handleLCustomerAction` and a `registerActions` that do not
 * exist in the codebase — it was never a working implementation waiting to be
 * switched on, and pretending otherwise hides a missing feature.
 * See issues.txt 18.21.
 */
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
  // The dead per-message limit check that stood here is gone; sendMessage, which
  // sendTemplateToUserCore reaches, enforces the live conversation limit.
  // See issues.txt 14.1(a).
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
