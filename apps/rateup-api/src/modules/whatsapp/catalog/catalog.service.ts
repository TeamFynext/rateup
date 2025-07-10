import {
  Contact,
  WaMessage,
  WhatsappSettings,
} from "../../../../generated/prisma/client";
import prisma from "../../../utils/prisma";
import { callWhatsappApi } from "../wa_axios";
import { UpdateCatalogSchema } from "./catalog.schema";
import { WaReceiveMessageBody } from "../../../types/whatsapp.types";
import { log } from "../../../utils/logger";

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
  });
}

export async function syncWaCatalogs(
  orgId: string,
  waSettings: Omit<WhatsappSettings, "accessToken_iv">,
  businessId: string,
) {
  const { accessToken } = waSettings;
  const res = await callWhatsappApi(
    `/${businessId}/owned_product_catalogs?fields=name,vertical&access_token=${accessToken}`,
    "GET",
  );
  const catalogs = res.data.data.map(({ id, ...rest }) => ({
    orgId,
    catalogId: id,
    ...rest,
  }));

  await prisma.whatsappCatalog.createMany({
    data: catalogs,
    skipDuplicates: true,
  });
  const existingCatalogs = await prisma.whatsappCatalog.findMany({
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
    await prisma.whatsappCatalog.deleteMany({
      where: {
        catalogId: {
          in: deletedCatalogs,
        },
      },
    });
  }

  if (updateCatalogs.length) {
    for (const catalog of updateCatalogs) {
      await prisma.whatsappCatalog.update({
        where: {
          catalogId: catalog.catalogId,
        },
        data: catalog.data,
      });
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

export async function getConnectedWaCatalog(orgId) {
  return await prisma.whatsappCatalog.findFirst({
    where: {
      orgId,
      isWhatsappConnected: true,
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
}
