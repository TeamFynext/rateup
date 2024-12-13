import { LoyaltyTemplate } from "@prisma/client";
import { LoyaltyTemplateTypes } from "../../../types/enums";
import prisma from "../../../utils/prisma";
import { LoyaltyTemplateInput } from "./settings.schema";
import {
  handleCustomerInfoWaRequest,
  handleLoyaltyRegister,
} from "../customer/customer.service";

export async function createLoyaltyTemplate(
  data: LoyaltyTemplateInput & { orgId: string },
) {
  return await prisma.loyaltyTemplate.create({
    data: {
      type: data.type,
      waTemplateId: data.waTemplateId,
      orgId: data.orgId,
      requestMessage: data.requestMessage,
    },
  });
}

export async function getLoyaltyTemplate(
  type: LoyaltyTemplateTypes,
  orgId: string,
) {
  return await prisma.loyaltyTemplate.findUnique({
    where: {
      type_org_unique: {
        type,
        orgId,
      },
    },
  });
}

export async function updateLoyaltyTemplate(type, orgId, data) {
  return await prisma.loyaltyTemplate.update({
    where: {
      type_org_unique: {
        type,
        orgId,
      },
    },
    data,
  });
}

export async function getLoyaltyTemplateByRequestMessage(
  orgId,
  requestMessage,
) {
  return await prisma.loyaltyTemplate.findUnique({
    where: {
      request_message_org_unique: {
        orgId,
        requestMessage,
      },
    },
  });
}

export async function handleLoyaltyTemplate(
  phone,
  name,
  orgId,
  template: LoyaltyTemplate,
) {
  switch (template.type) {
    case LoyaltyTemplateTypes.CustomerInfo:
      await handleCustomerInfoWaRequest(phone);
      break;
    case LoyaltyTemplateTypes.CustomerRegistration:
      await handleLoyaltyRegister(phone, name, orgId);
      break;
  }
}

export async function getAllLoyaltyTemplates(orgId) {
  const templates = await prisma.loyaltyTemplate.findMany({
    where: {
      orgId,
    },
    include: {
      waTemplate: {
        select: {
          data: true,
        },
      },
    },
  });
  return templates.map((t) => ({
    ...t,
    templateName: t.waTemplate.data.name,
    waTemplate: undefined,
  }));
}
