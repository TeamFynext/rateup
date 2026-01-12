import {
  Contact,
  WaMessage,
  WhatsappSettings,
} from "../../../../generated/prisma/client.js";
import prisma from "../../../utils/prisma.js";
import { callWhatsappApi } from "../wa_axios.js";
import {
  CatalogWhatsappSettingSchema,
  UpdateCatalogSchema,
} from "./catalog.schema.js";
import { WaReceiveMessageBody } from "../../../types/whatsapp.types.js";
import { log } from "../../../utils/logger.js";
import {
  getAllWaSettings,
  getWaSettingsById,
  getWaSettingsWithAccessTokenDecrypted,
} from "../settings/wa_settings.service.js";
import { MetaLoginAssets, WaConfigType } from "../../../types/enums.js";
import { createShopifyDraftOrder } from "../../integrations/shopify/shopify.service.js";
import { sendMessage } from "../whatsappSurvey/wasurvey.service.js";

export async function updateWaCatalog(
  catalogId: string,
  data: UpdateCatalogSchema,
) {
  await prisma.whatsappCatalog.update({
    where: {
      catalogId,
    },
    data,
  });
}

export async function getWaCatalog(catalogId) {
  return await prisma.whatsappCatalog.findUnique({
    where: {
      catalogId,
    },
    include: {
      connectedWaPhoneIds: true,
    },
  });
}

async function getMetaBusinessInfoByWABAId(wabaId, accessToken) {
  const res = await callWhatsappApi(
    `/${wabaId}?fields=on_behalf_of_business_info&access_token=${accessToken}`,
    "GET",
  );
  return res.data.on_behalf_of_business_info;
}

export async function syncWaCatalogs(orgId: string) {
  const waSettings = await getAllWaSettings(orgId);
  const map = new Map();
  for (const setting of waSettings) {
    try {
      if (
        setting.type === WaConfigType.Automated &&
        !setting.assets.includes(MetaLoginAssets.CATALOGS)
      )
        continue;
      const { accessToken, wabaId } = setting;
      let businessId = map.get(wabaId);
      if (businessId) continue; //already synced
      map.set(wabaId, businessId);
      const businessInfo = await getMetaBusinessInfoByWABAId(
        wabaId,
        accessToken,
      );
      if (!businessInfo) {
        continue;
      }
      businessId = businessInfo.id;

      const res = await callWhatsappApi(
        `/${businessId}/owned_product_catalogs?fields=name,vertical&access_token=${accessToken}`,
        "GET",
      );

      const catalogs = res.data.data.map(({ id, ...rest }) => ({
        orgId,
        catalogId: id,
        ...rest,
      }));

      await prisma.$transaction(async (tx) => {
        await tx.whatsappCatalog.createMany({
          data: catalogs,
          skipDuplicates: true,
        });
        const existingCatalogs = await tx.whatsappCatalog.findMany({
          where: {
            orgId,
          },
        });
        const updateCatalogs = [];
        const deletedCatalogs = [];
        existingCatalogs.map((ct) => {
          const catalog = res.data.data.find((c) => c.id === ct.catalogId);
          if (!catalog) {
            deletedCatalogs.push(ct.catalogId);
            return;
          }
          if (catalog.name !== ct.name || catalog.vertical !== ct.vertical) {
            updateCatalogs.push({
              catalogId: ct.catalogId,
              data: {
                name: catalog.name,
                vertical: catalog.vertical,
              },
            });
          }
        });

        if (deletedCatalogs.length) {
          await tx.whatsappCatalog.deleteMany({
            where: {
              catalogId: {
                in: deletedCatalogs,
              },
            },
          });
        }

        if (updateCatalogs.length) {
          for (const catalog of updateCatalogs) {
            await tx.whatsappCatalog.update({
              where: {
                catalogId: catalog.catalogId,
              },
              data: catalog.data,
            });
          }
        }
      });
      const connectedCatalog = await callWhatsappApi(
        `/${wabaId}/product_catalogs?access_token=${accessToken}`,
        "GET",
      );
      console.log("connectedCatalog", connectedCatalog.data);
      if (!connectedCatalog.data.data.length) {
        await prisma.catalogPhoneIdMap.deleteMany({
          where: {
            WhatsappSettings: {
              wabaId,
            },
          },
        });
        continue;
      }
      await prisma.catalogPhoneIdMap.createMany({
        data: waSettings
          .filter((s) => s.wabaId === wabaId)
          .map((s) => ({
            catalogId: connectedCatalog.data.data[0].id,
            whatsappSettingsPhoneId: s.phoneId,
          })),
        skipDuplicates: true,
      });
    } catch (e) {
      log.error(e);
    }
  }
}

export async function getWaCatalogsByOrg(orgId) {
  return await prisma.whatsappCatalog.findMany({
    where: {
      orgId,
    },
  });
}

export async function getConnectedWaCatalog(whatsappSettingsPhoneId) {
  return await prisma.whatsappCatalog.findFirst({
    where: {
      connectedWaPhoneIds: {
        some: {
          whatsappSettingsPhoneId: whatsappSettingsPhoneId,
        },
      },
    },
    include: {
      products: true,
    },
  });
}

export async function handleWaOrderfromCatalog(
  data: WaReceiveMessageBody,
  messageObj: WaMessage,
  waSettings: Omit<WhatsappSettings, "accessToken_iv">,
) {
  const order = data.messages[0].order;
  const catalog = await prisma.whatsappCatalog.findUnique({
    where: {
      catalogId: order.catalog_id,
    },
  });
  if (!catalog) {
    log.trace("catalog not synced yet => %s", order.catalog_id);
    return;
  }
  const products = order.product_items.map((p) => ({
    retailerId: p.product_retailer_id,
    currency: p.currency,
    price: p.item_price,
    quantity: p.quantity,
  }));
  const newOrder = await prisma.waCatalogOrder.create({
    data: {
      catalogId: order.catalog_id,
      contactId: messageObj.contactId,
      products: products as any,
      createdAt: messageObj.waCreatedAt,
    },
  });
  log.info("Order placed => %o", newOrder);

  //auto checkout
  if (catalog.autoCheckoutEnabled) {
    try {
      const draftOrder = await createShopifyDraftOrder(catalog.orgId, products);
      if (draftOrder && draftOrder.invoiceUrl) {
        await prisma.waCatalogOrder.update({
          where: { id: newOrder.id },
          data: {
            shopifyDraftOrderId: draftOrder.id,
            shopifyInvoiceUrl: draftOrder.invoiceUrl,
          },
        });

        const message =
          catalog.checkoutMessage ||
          "Thanks for your order! You can complete your purchase here: {{link}}";
        const finalMessage = message.replace("{{link}}", draftOrder.invoiceUrl);

        await sendMessage(
          catalog.orgId,
          {
            to:
              (data.messages[0] as any).from || (data.messages[0] as any).phone,
            type: "text",
            text: { body: finalMessage },
            messaging_product: "whatsapp",
          },
          "System",
          undefined,
          waSettings.phoneId,
        );
      }
    } catch (error) {
      log.error("Failed to create Shopify Draft Order: %o", error);
    }
  }
}

export async function updateConnectWaCatalog(wabaId, orgId, catalogId) {
  const waSettings = await prisma.whatsappSettings.findMany({
    where: {
      wabaId: wabaId,
      orgId: orgId,
      OR: [
        {
          type: WaConfigType.Automated,
          assets: {
            has: MetaLoginAssets.CATALOGS,
          },
        },
        {
          type: WaConfigType.Manual,
        },
      ],
    },
    orderBy: {
      createdAt: "desc",
    },
  });
  if (!waSettings.length) {
    throw Error("No whatsapp settings found");
  }
  const { accessToken } = getWaSettingsWithAccessTokenDecrypted(waSettings[0]);
  let url = `/${wabaId}/product_catalogs`;
  const res = await callWhatsappApi(url, "POST", accessToken, {
    catalog_id: catalogId,
  });
  if (res?.data?.success) {
    await prisma.catalogPhoneIdMap.createMany({
      data: waSettings.map((s) => ({
        catalogId,
        whatsappSettingsPhoneId: s.phoneId,
      })),
      skipDuplicates: true,
    });
  }
}

export async function disconnectCatalogFromWaba({
  whatsappSettingsId,
  catalogId,
}: CatalogWhatsappSettingSchema) {
  const waSettings = await getWaSettingsById(whatsappSettingsId);
  const { wabaId, accessToken } = waSettings;
  const res = await callWhatsappApi(
    `/${wabaId}/product_catalogs`,
    "DELETE",
    accessToken,
    { catalog_id: catalogId },
  );
  if (!res.data.success) throw Error("Something went wrong");
  await prisma.catalogPhoneIdMap.deleteMany({
    where: {
      WhatsappSettings: {
        wabaId,
      },
      catalogId,
    },
  });
}
