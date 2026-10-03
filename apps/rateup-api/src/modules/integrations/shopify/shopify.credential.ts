import prisma from "../../../utils/prisma.js";
import { IntegratedApps } from "../../../types/enums.js";
import { getIntegrationByName, updateIntegrationByName } from "../integrations.service.js";
import { UpdateIntgrationInput } from "../integrations.schema.js";
import type { Org } from "../../../../generated/prisma/client.js";
import type { CommerceSurvey } from "../commerce/commerce.types.js";

export async function getShopifyInfo(orgId: string) {
  return (await getIntegrationByName(
    orgId,
    IntegratedApps.shopify,
  )) as unknown as ShopifyIntegration;
}

export async function getShopifyIntegrationByShop(shop: string) {
  return (await prisma.integration.findFirst({
    where: {
      credential: {
        path: ["session", "shop"],
        equals: shop,
      },
    },
    include: {
      org: true,
    },
  })) as unknown as ShopifyIntegration & { org: Org };
}

export async function updateShopifyIntegrationByOrgId(orgId: string, data: UpdateIntgrationInput) {
  return await updateIntegrationByName(orgId, IntegratedApps.shopify, data);
}

export async function updateShopifyIntegrationByShop(
  shop: string,
  // Not the credential: those writes go through updateIntegrationByName, which
  // keeps the stored session intact.
  data: Omit<UpdateIntgrationInput, "credential"> & { orgId?: string },
) {
  return await prisma.integration.updateMany({
    where: {
      credential: {
        path: ["session", "shop"],
        equals: shop,
      },
    },
    data,
  });
}

export async function claimUnownedShopifyIntegration(shop: string, orgId: string) {
  return await prisma.integration.updateMany({
    where: {
      credential: {
        path: ["session", "shop"],
        equals: shop,
      },
      orgId: null,
    },
    data: { orgId },
  });
}

/**
 * Writes the surveys back to the Shopify credential. Through
 * `updateIntegrationByName`, which carries the stored session over rather than
 * restoring a token pair a refresh has since retired.
 */
export async function saveShopifySurveys(
  store: { orgId: string; integration: { credential: unknown } },
  surveys: CommerceSurvey[],
) {
  await updateShopifyIntegrationByOrgId(store.orgId, {
    credential: {
      ...(store.integration.credential as ShopifyCredential),
      shopifySurveys: surveys as unknown as ShopifySurvey[],
    },
  });
}

export async function deleteShopifyIntegrationByShop(shop: string) {
  await prisma.integration.deleteMany({
    where: {
      credential: {
        path: ["session", "shop"],
        equals: shop,
      },
    },
  });
}
