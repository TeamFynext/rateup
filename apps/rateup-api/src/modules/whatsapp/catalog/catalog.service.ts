import {
  Contact,
  WaMessage,
  WhatsappSettings,
} from "../../../../generated/prisma/client.js";
import prisma from "../../../utils/prisma.js";
import { callWhatsappApi, GraphApiError } from "../wa_axios.js";
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
import {
  buildShopifyCartUrl,
  createShopifyPendingOrder,
} from "../../integrations/shopify/shopify.service.js";

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
      if (map.has(wabaId)) continue; //already synced
      map.set(wabaId, true);
      const businessInfo = await getMetaBusinessInfoByWABAId(
        wabaId,
        accessToken,
      );
      if (!businessInfo) {
        continue;
      }
      const businessId = businessInfo.id;

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
      if (connectedCatalog.data?.data) {
        if (connectedCatalog.data.data.length === 0) {
          await prisma.catalogPhoneIdMap.deleteMany({
            where: {
              WhatsappSettings: {
                wabaId,
              },
            },
          });
        } else {
          const phoneIds = waSettings
            .filter((s) => s.wabaId === wabaId)
            .map((s) => s.phoneId);

          // Clear existing mappings for these phone numbers before re-syncing from Meta
          // This ensures we always have the most up-to-date mappings
          await prisma.catalogPhoneIdMap.deleteMany({
            where: {
              whatsappSettingsPhoneId: { in: phoneIds },
            },
          });

          const mappings = [];
          for (const linkedCatalog of connectedCatalog.data.data) {
            for (const phoneId of phoneIds) {
              mappings.push({
                catalogId: linkedCatalog.id,
                whatsappSettingsPhoneId: phoneId,
              });
            }
          }

          if (mappings.length) {
            await prisma.catalogPhoneIdMap.createMany({
              data: mappings,
              skipDuplicates: true,
            });
          }
        }
      }
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
  const retailerIds = order.product_items.map((p) => p.product_retailer_id);
  const dbProducts = await prisma.waCatalogProduct.findMany({
    where: {
      catalogId: order.catalog_id,
      retailer_id: { in: retailerIds },
    },
  });

  const productsWithDetails = order.product_items.map((p) => {
    const dbProduct = dbProducts.find(
      (dp) => dp.retailer_id === p.product_retailer_id,
    );
    const props = (dbProduct?.productProps as any) || {};

    // Exclude fields that are explicitly handled or not needed in the dynamic spread
    const {
      title,
      name,
      image_link,
      image,
      retailer_id,
      description,
      price: _price,
      currency: _currency,
      ...restProps
    } = props;

    // Prioritize image link from props, fallback to product item image if available
    return {
      retailerId: p.product_retailer_id,
      currency: p.currency,
      price: p.item_price,
      quantity: p.quantity,
      title: title || name || `Product ${p.product_retailer_id}`,
      image: image_link || (image && image.length > 0 ? image[0].url : null),
      ...restProps, // Dynamically spread all other properties (size, color, material, pattern, additional_variant_attributes, etc.)
    };
  });

  let shopifyDraftOrderId = null;
  if ((waSettings?.paymentMethod ?? "NATIVE") === "NATIVE") {
    try {
      const shopifyOrder = await createShopifyPendingOrder(
        catalog.orgId,
        productsWithDetails.map((p) => ({
          retailerId: p.retailerId,
          quantity: p.quantity,
          title: p.title,
        })),
      );
      if (shopifyOrder && shopifyOrder.id) {
        shopifyDraftOrderId = shopifyOrder.id.toString();
        log.info(
          "Created Shopify pending order %s for orgId %s",
          shopifyDraftOrderId,
          catalog.orgId,
        );
      }
    } catch (e) {
      log.error(
        "Failed to create pending order in Shopify during WA checkout => %o",
        e,
      );
    }
  }

  const newOrder = await prisma.waCatalogOrder.create({
    data: {
      catalogId: order.catalog_id,
      contactId: messageObj.contactId,
      products: productsWithDetails,
      createdAt: messageObj.waCreatedAt,
      paymentMethod: waSettings?.paymentMethod ?? "NATIVE",
      shopifyDraftOrderId,
    },
  });
  log.info("Order placed => %o", newOrder);

  if (waSettings?.paymentMethod === "SHOPIFY_LINK") {
    try {
      // Resolve retailer_ids (Shopify SKUs / product titles) → numeric variant IDs → cart URL
      const checkoutUrl = await buildShopifyCartUrl(
        catalog.orgId,
        (newOrder.products as any[]).map((p) => ({
          retailerId: p.retailerId,
          quantity: p.quantity,
          title: p.title, // passed for title-based fallback lookup
        })),
      );

      if (checkoutUrl) {
        const products = newOrder.products as any[];
        const productLines = products
          .map((p) => {
            const qty = p.quantity > 1 ? ` ×${p.quantity}` : "";
            const price =
              p.price !== undefined
                ? ` - ${p.currency ?? ""}${parseFloat(p.price).toFixed(2)}`
                : "";
            return `• ${p.title}${qty}${price}`;
          })
          .join("\n");

        await sendMessage(catalog.orgId, {
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: (messageObj as any).from || data.messages[0].from,
          type: "text",
          text: {
            body: `🛍️ *Order Summary*\n${productLines}\n\nPlease complete your purchase securely using the link below:\n\n${checkoutUrl}`,
            preview_url: true,
          },
        });
      } else {
        log.warn(
          "Could not build Shopify cart URL for org %s — no message sent to customer",
          catalog.orgId,
        );
      }
    } catch (e) {
      log.error("Error generating Shopify checkout link => %o", e);
    }
    // Always return for SHOPIFY_LINK — do NOT fall through to native payment
    return;
  }

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
        waSettings,
        newOrder.id,
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
  waSettings: Omit<WhatsappSettings, "accessToken_iv">,
  catalogOrderId?: string,
) {
  try {
    const waSetting = waSettings;

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

    if (catalogOrderId) {
      await prisma.waCatalogOrder.update({
        where: { id: catalogOrderId },
        data: { transactionId: referenceId },
      });
    }

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

  try {
    const res = await callWhatsappApi(url, "POST", accessToken, {
      catalog_id: catalogId,
    });

    if (res?.data?.success) {
      const phoneIds = waSettings.map((s) => s.phoneId).filter(Boolean);
      await prisma.catalogPhoneIdMap.deleteMany({
        where: {
          whatsappSettingsPhoneId: { in: phoneIds },
        },
      });
      await prisma.catalogPhoneIdMap.createMany({
        data: phoneIds.map((pId) => ({
          catalogId,
          whatsappSettingsPhoneId: pId,
        })),
        skipDuplicates: true,
      });
    }
  } catch (error) {
    if (error instanceof GraphApiError) {
      // Error code 100 or subcode 2388099 usually indicates catalog is already linked
      if (error.error.code === 100 || error.error.error_subcode === 2388099) {
        log.info(
          "Catalog %s already linked to WABA %s, updating mapping in DB",
          catalogId,
          wabaId,
        );
        const phoneIds = waSettings.map((s) => s.phoneId).filter(Boolean);
        await prisma.catalogPhoneIdMap.deleteMany({
          where: {
            whatsappSettingsPhoneId: { in: phoneIds },
          },
        });
        await prisma.catalogPhoneIdMap.createMany({
          data: phoneIds.map((pId) => ({
            catalogId,
            whatsappSettingsPhoneId: pId,
          })),
          skipDuplicates: true,
        });
        return;
      }
    }
    throw error;
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
