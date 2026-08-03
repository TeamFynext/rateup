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
