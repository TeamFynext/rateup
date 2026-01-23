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
import { syncProductSetsForCatalog } from "./productSet.service.js";
import { WaReceiveMessageBody } from "../../../types/whatsapp.types.js";
import { log } from "../../../utils/logger.js";
import {
  getAllWaSettings,
  getWaSettings,
  getWaSettingsById,
  getWaSettingsWithAccessTokenDecrypted,
} from "../settings/wa_settings.service.js";
import { MetaLoginAssets, WaConfigType } from "../../../types/enums.js";
import { createNativePaymentMessage } from "../whatsappSurvey/wasurvey.utils.js";
import { generateOrderReferenceId } from "../automatedReply/wa_automatedReply.utils.js";
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

      // Sync product sets for each catalog
      const allCatalogs = await prisma.whatsappCatalog.findMany({
        where: { orgId },
      });
      for (const catalog of allCatalogs) {
        try {
          await syncProductSetsForCatalog(
            catalog.catalogId,
            orgId,
            accessToken,
          );
        } catch (e) {
          log.error(
            "Error syncing product sets for catalog %s: %o",
            catalog.catalogId,
            e,
          );
        }
      }

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
    include: {
      connectedWaPhoneIds: true,
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
  const newOrder = await prisma.waCatalogOrder.create({
    data: {
      catalogId: order.catalog_id,
      contactId: messageObj.contactId,
      products: order.product_items.map((p) => ({
        retailerId: p.product_retailer_id,
        currency: p.currency,
        price: p.item_price,
        quantity: p.quantity,
      })),
      createdAt: messageObj.waCreatedAt,
    },
  });
  log.info("Order placed => %o", newOrder);

  // Trigger Native Payment if configured
  try {
    const contact = await prisma.contact.findUnique({
      where: { id: messageObj.contactId },
    });

    if (contact && contact.phone) {
      await handleWaOrderNativePayment(
        catalog.orgId,
        contact.phone,
        order.catalog_id,
        newOrder.products as any,
      );
    }
  } catch (e) {
    log.error("Error triggering native payment => %o", e);
  }
}

export async function handleWaOrderNativePayment(
  orgId: string,
  contactPhone: string,
  catalogId: string,
  productItems: {
    retailerId: string;
    quantity: number;
    price: number;
    currency: string;
  }[],
) {
  try {
    const waSetting = await getWaSettings(orgId);

    if (!waSetting || !waSetting.wabaId) {
      log.trace(
        "WhatsApp settings or WABA ID not found for orgId => %s",
        orgId,
      );
      return;
    }

    // Fetch payment configurations from Meta
    const paymentConfigsResponse = await callWhatsappApi(
      `/${waSetting.wabaId}/payment_configurations`,
      "GET",
      waSetting.accessToken,
    );

    const paymentConfigs = paymentConfigsResponse?.data?.data || [];

    let activeConfig = null;

    for (const item of paymentConfigs) {
      activeConfig = item.payment_configurations?.find(
        (config: any) => config.status?.toLowerCase() === "active",
      );
      if (activeConfig) break;
    }

    if (!activeConfig) {
      log.trace(
        "No active payment configuration found on Meta for wabaId => %s",
        waSetting.wabaId,
      );
      return;
    }

    const providerType = activeConfig.provider_name?.toLowerCase();
    const configName = activeConfig.configuration_name;

    const retailerIds = productItems.map((p) => p.retailerId);
    const dbProducts = await prisma.waCatalogProduct.findMany({
      where: {
        retailer_id: { in: retailerIds },
        catalogId: catalogId,
      },
    });

    const paymentProducts = productItems.map((p) => {
      const dbP = dbProducts.find((dp) => dp.retailer_id === p.retailerId);
      return {
        name: (dbP?.productProps as any)?.title || `Product ${p.retailerId}`,
        amount: p.price * 100, // multiplying by 100 to account for the 2 decimal offset
        quantity: p.quantity,
      };
    });

    const referenceId = generateOrderReferenceId();

    const message = createNativePaymentMessage(
      contactPhone,
      referenceId,
      configName,
      paymentProducts,
      productItems[0].currency || "INR",
      providerType,
      "Thank you for your order! Please complete the payment below.",
    );

    await sendMessage(orgId, message);
    log.info(
      "Sent native payment request to %s for order %s",
      contactPhone,
      referenceId,
    );
  } catch (e) {
    log.error("Error in handleWaOrderNativePayment => %o", e);
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
