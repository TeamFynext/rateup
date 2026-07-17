import { FastifyReply, FastifyRequest } from "fastify";
import { ContactCore } from "./contact.schema.js";
import { ContactGroupType } from "./contactGroup/contactGroup.schema.js";
import { log } from "../../utils/logger.js";
import prisma from "../../utils/prisma.js";
import { getNestedProperty } from "../../utils/misc/obj.utils.js";
import { SubscriptionFeaturePathName } from "../../types/enums.js";
import { parsePhoneforWa } from "../loyalty/util.js";
import { updateMonthlyStat } from "../stats/stats.service.js";
import { getSubscription } from "../subscription/subscription.service.js";
import { verifyTemplateMessageLimit } from "../whatsapp/messageTemplates/wa_templates.auth.js";
import { sendTemplateToUserCore } from "../whatsapp/messageTemplates/wa_templates.controller.js";

export async function verifyLCustomerMaxCountRestrictionHandler(
  request: FastifyRequest<{ Body: { orgId?: string } & ContactCore }>,
  reply: FastifyReply,
) {
  // TODO: re-check
  // try {
  //   if (request.body.source !== ContactGroupType.LOYALTY) return;
  //   const orgId = request.body.orgId ?? request.user.orgId;
  //   if (!(await verifyLCustomerMaxCountRestriction(orgId, request.subscription))) {
  //     return reply.code(403).send({
  //       message: "Registration limit reached",
  //       displayMessageInClient: true,
  //     });
  //   }
  // } catch (e) {
  //   log.error(e);
  //   return reply.code(500).send(e);
  // }
}
export async function verifyLCustomerMaxCountRestriction(orgId, subscription) {
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

  const { loyaltyCustomerCount } = await prisma.usageStats.findUnique({
    where: {
      orgId,
    },
    select: {
      loyaltyCustomerCount: true,
    },
  });

  if (loyaltyCustomerCount !== count)
    await prisma.usageStats.update({
      where: {
        orgId,
      },
      data: {
        loyaltyCustomerCount: count,
      },
    });

  if (
    count >=
    getNestedProperty(
      subscription?.features as unknown as object,
      SubscriptionFeaturePathName.Whatsapp,
    ).count.max
  ) {
    return false;
  }
  return true;
}

export async function createLCustomer(input: any) {
  const contact = await prisma.contact.upsert({
    where: {
      contact_phone_org_id_unique: {
        phone: parsePhoneforWa(input.phone),
        orgId: input.orgId,
      },
    },
    update: {
      source: ContactGroupType.LOYALTY,
      name: input.name,
      dob: input.dob ?? null,
      email: input.email,
      external_id: input.external_id,
      // loyaltyAccounts: {
      //   create: {
      //     // orgId: input.orgId,

      //   },
      // },
    },
    create: {
      phone: parsePhoneforWa(input.phone),
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
      data: input.customFields.map((field) => ({
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

export async function handlePostRegisterAction(_orgId, _customerId) {
  // for (const action of registerActions) {
  //   const { success, data, message } = await handleLCustomerAction({
  //     action,
  //     customerId,
  //     actionId: action.id,
  //   });
  //   if (success) {
  //     const { customerAction, customer, customerPoints } = data;
  //     await handleSendTemplate(
  //       customerAction.action.waTemplateId,
  //       orgId,
  //       customer.Contact.phone,
  //       [customer.Contact.name, customerPoints?.toString()]
  //     );
  //   }
  // }
}

export async function handleSendTemplate(waTemplateId, orgId, phone, dynamicVariables) {
  if (!waTemplateId) {
    log.trace("No template Id found");
    return;
  }
  const components = [];
  components.push({
    type: "body",
    parameters: dynamicVariables.map((data: string) => ({
      type: "text",
      text: data,
    })),
  });
  const subscription = await getSubscription(orgId);
  await verifyTemplateMessageLimit(subscription);
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
