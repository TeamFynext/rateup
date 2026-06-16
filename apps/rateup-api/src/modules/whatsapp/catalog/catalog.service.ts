import {
  Contact,
  WaMessage,
  WhatsappSettings,
} from "../../../../generated/prisma/client.js";
import prisma from "../../../utils/prisma.js";
import { callMetaApi, GraphApiError } from "../wa_axios.js";
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
import {
  MetaLoginAssets,
  WaConfigType,
  CatalogPaymentMethod,
  CatalogAddressFlowStatus,
  CatalogOrderStage,
  CatalogStoreType,
} from "../../../types/enums.js";
import { createNativePaymentMessage } from "../whatsappSurvey/wasurvey.utils.js";
import { generateOrderReferenceId } from "../automatedReply/wa_automatedReply.utils.js";
import { sendMessage } from "../whatsappSurvey/wasurvey.service.js";
import { buildShopifyCartUrl } from "../../integrations/shopify/shopify.service.js";
import {
  sendAddressFlowToCustomer,
  sendDeliveryListMessage,
} from "./catalogSettings.service.js";

export async function deleteWaCatalog(catalogId: string) {
  await prisma.whatsappCatalog.delete({
    where: { catalogId },
  });
}

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
  const res = await callMetaApi(
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

      const res = await callMetaApi(
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
      const connectedCatalog = await callMetaApi(
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

export async function syncConnectedCatalog(orgId: string) {
  const waSettings = await getAllWaSettings(orgId);
  const seenWabaIds = new Set<string>();
  const results: {
    wabaId: string;
    synced: boolean;
    catalogIds?: string[];
    warning?: string;
  }[] = [];

  for (const setting of waSettings) {
    const { accessToken, wabaId, phoneId } = setting;
    if (seenWabaIds.has(wabaId)) continue;
    seenWabaIds.add(wabaId);

    try {
      const res = await callMetaApi(
        `/${wabaId}/product_catalogs`,
        "GET",
        accessToken,
      );
      const connectedCatalogs: { id: string; name: string }[] =
        res.data?.data ?? [];

      if (connectedCatalogs.length === 0) {
        results.push({
          wabaId,
          synced: false,
          warning: "No catalog is connected to this WhatsApp account on Meta.",
        });
        continue;
      }

      const catalogIds = connectedCatalogs.map((c) => c.id);
      const existingInDb = await prisma.whatsappCatalog.findMany({
        where: { catalogId: { in: catalogIds }, orgId },
        select: { catalogId: true },
      });
      const foundIds = new Set(existingInDb.map((c) => c.catalogId));
      const missingIds = catalogIds.filter((id) => !foundIds.has(id));

      if (missingIds.length > 0) {
        results.push({
          wabaId,
          synced: false,
          warning: `Connected catalog(s) not found locally. Please run a full catalog sync first.`,
          catalogIds: missingIds,
        });
        continue;
      }

      // Update CatalogPhoneIdMap for all phone IDs under this wabaId
      const phoneIds = waSettings
        .filter((s) => s.wabaId === wabaId)
        .map((s) => s.phoneId);

      await prisma.catalogPhoneIdMap.deleteMany({
        where: { whatsappSettingsPhoneId: { in: phoneIds } },
      });

      const mappings = connectedCatalogs.flatMap((catalog) =>
        phoneIds.map((pid) => ({
          catalogId: catalog.id,
          whatsappSettingsPhoneId: pid,
        })),
      );

      if (mappings.length) {
        await prisma.catalogPhoneIdMap.createMany({
          data: mappings,
          skipDuplicates: true,
        });
      }

      results.push({ wabaId, synced: true, catalogIds });
    } catch (e) {
      log.error(e);
      results.push({
        wabaId,
        synced: false,
        warning: "Failed to fetch connected catalog from Meta.",
      });
    }
  }

  return results;
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

  const newOrder = await prisma.waCatalogOrder.create({
    data: {
      catalogId: order.catalog_id,
      contactId: messageObj.contactId,
      products: productsWithDetails,
      createdAt: messageObj.waCreatedAt,
      paymentMethod: waSettings?.paymentMethod ?? "NATIVE",
      storeType: (catalog as any).storeType ?? CatalogStoreType.STANDARD,
      orderStage: CatalogOrderStage.PENDING_ADDRESS,
    },
  });
  log.info("Order placed => %o", newOrder);

  // Fetch full catalog config
  const catalogFull = await prisma.whatsappCatalog.findUnique({
    where: { catalogId: order.catalog_id },
    select: {
      storeType: true,
      paymentMethod: true,
      collectAddress: true,
      collectDelivery: true,
      addressFlowId: true,
      addressFlowStatus: true,
      deliveryOptions: true,
      standardPaymentConfig: true,
      fixedDeliveryCharge: true,
      fixedDeliveryAmount: true,
      orgId: true,
    },
  });

  const catalogPaymentMethod =
    (catalogFull as any)?.paymentMethod ?? CatalogPaymentMethod.MANUAL;
  const collectAddress = (catalogFull as any)?.collectAddress ?? false;
  const collectDelivery = (catalogFull as any)?.collectDelivery ?? false;
  const hasApprovedFlow =
    catalogFull?.addressFlowId &&
    catalogFull?.addressFlowStatus === CatalogAddressFlowStatus.APPROVED;

  const contact = await prisma.contact.findUnique({
    where: { id: messageObj.contactId },
    select: { phone: true },
  });
  const customerPhone = contact?.phone ?? data.messages[0].from;

  // Route 1: Shopify Checkout URL - send cart link immediately
  if (
    catalogPaymentMethod === CatalogPaymentMethod.SHOPIFY_CHECKOUT ||
    waSettings?.paymentMethod === "SHOPIFY_LINK"
  ) {
    try {
      const checkoutUrl = await buildShopifyCartUrl(
        catalog.orgId,
        (newOrder.products as any[]).map((p) => ({
          retailerId: p.retailerId,
          quantity: p.quantity,
          title: p.title,
        })),
      );
      if (checkoutUrl) {
        const productLines = (newOrder.products as any[])
          .map((p) => {
            const qty = p.quantity > 1 ? ` ×${p.quantity}` : "";
            const price =
              p.price !== undefined
                ? ` - ${p.currency ?? ""}${parseFloat(p.price).toFixed(2)}`
                : "";
            return `• ${p.title}${qty}${price}`;
          })
          .join("\n");
        await sendMessage(
          catalog.orgId,
          {
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to: customerPhone,
            type: "text",
            text: {
              body: `🛍️ *Order Summary*\n${productLines}\n\nComplete your purchase securely:\n\n${checkoutUrl}`,
              preview_url: true,
            },
          },
          undefined,
          undefined,
          waSettings?.phoneId,
        );
        await prisma.waCatalogOrder.update({
          where: { id: newOrder.id },
          data: { orderStage: CatalogOrderStage.PENDING_CHECKOUT } as any,
        });
      } else {
        log.warn("Could not build Shopify cart URL for org %s", catalog.orgId);
      }
    } catch (e) {
      log.error("Error generating Shopify checkout link => %o", e);
    }
    return; // Shopify checkout — done
  }

  //  Route 2: Collect address first (if enabled + flow approved)
  if (collectAddress && hasApprovedFlow) {
    try {
      if (customerPhone) {
        await sendAddressFlowToCustomer({
          orgId: catalog.orgId,
          phone: customerPhone,
          orderId: newOrder.id,
          waFlowId: catalogFull.addressFlowId,
          whatsappSettingsPhoneId: waSettings?.phoneId,
        });
        log.info(
          "Address flow sent for order %s to %s",
          newOrder.id,
          customerPhone,
        );
        return; // Continue when customer submits flow (handleAddressFlowResponse)
      }
    } catch (e) {
      log.error("Failed to send address flow for order %s: %o", newOrder.id, e);
    }
  }

  // Route 3: Skip address - check delivery
  const deliveryOptions = (catalogFull?.deliveryOptions as any[]) ?? [];
  const shouldAskDelivery =
    collectDelivery &&
    !catalogFull.fixedDeliveryCharge &&
    deliveryOptions.some((o: any) => o.enabled);

  if (shouldAskDelivery) {
    try {
      const { sendDeliveryListMessage } =
        await import("./catalogSettings.service.js");
      await sendDeliveryListMessage({
        orgId: catalog.orgId,
        phone: customerPhone,
        deliveryOptions,
        whatsappSettingsPhoneId: waSettings?.phoneId,
      });
      await prisma.waCatalogOrder.update({
        where: { id: newOrder.id },
        data: { orderStage: CatalogOrderStage.PENDING_DELIVERY } as any,
      });
      log.info("Delivery list sent for order %s", newOrder.id);
      return; // Continue when customer picks delivery (handleDeliveryListReply)
    } catch (e) {
      log.error("Error sending delivery list for order %s: %o", newOrder.id, e);
    }
  }

  // Route 4: No address, no delivery — dispatch payment directly
  try {
    const fixedOption = catalogFull.fixedDeliveryCharge
      ? { name: "Fixed Delivery", charge: catalogFull.fixedDeliveryAmount ?? 0 }
      : null;

    const { dispatchPaymentMessage } =
      await import("./catalogSettings.service.js");
    await dispatchPaymentMessage(
      {
        id: newOrder.id,
        products: newOrder.products as any[],
        shippingAddress: null,
        deliveryOption: fixedOption,
        catalogId: order.catalog_id,
        contactId: messageObj.contactId,
      },
      {
        orgId: catalog.orgId,
        storeType: (catalogFull as any)?.storeType,
        paymentMethod: catalogPaymentMethod,
        standardPaymentConfig: (catalogFull as any)?.standardPaymentConfig,
      },
      customerPhone,
      waSettings?.phoneId,
    );
  } catch (e) {
    log.error("Error dispatching payment for order %s: %o", newOrder.id, e);
    // Final fallback: native payment (existing behaviour)
    await handleWaOrderNativePayment(
      catalog.orgId,
      customerPhone,
      order.catalog_id,
      newOrder.products as any,
      waSettings,
      newOrder.id,
    );
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
  deliveryOption?: { name?: string; charge?: number } | null,
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
    const paymentConfigsResponse = await callMetaApi(
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

    const paymentProducts: any[] = productItems.map((p) => {
      const dbP = dbProducts.find((dp) => dp.retailer_id === p.retailerId);
      return {
        name: (dbP?.productProps as any)?.title || `Product ${p.retailerId}`,
        amount: p.price * 100, // multiplying by 100 to account for the 2 decimal offset
        quantity: p.quantity,
      };
    });

    const shippingObj =
      deliveryOption && (deliveryOption.charge ?? 0) > 0
        ? {
            value: Number(deliveryOption.charge) * 100,
            description: `🚚 Delivery (${deliveryOption.name ?? "Standard"})`,
          }
        : null;

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
      undefined,
      shippingObj,
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
    const res = await callMetaApi(url, "POST", accessToken, {
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
  const res = await callMetaApi(
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
