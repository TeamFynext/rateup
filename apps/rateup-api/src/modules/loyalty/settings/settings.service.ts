import { LoyaltyTemplateTypes } from "../../../types/enums";
import prisma from "../../../utils/prisma";
import { LoyaltyTemplateInput } from "./settings.schema";

export async function createLoyaltyTemplate(
  data: LoyaltyTemplateInput & { orgId: string },
) {
  return await prisma.loyaltyTemplate.create({
    data: {
      type: data.type,
      waTemplateId: data.waTemplateId,
      orgId: data.orgId,
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
