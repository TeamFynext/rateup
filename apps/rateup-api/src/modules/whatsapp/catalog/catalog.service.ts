import { WhatsappSettings, WhatsaAppCatalog } from "@prisma/client";
import prisma from "../../../utils/prisma";
import { getWaSettings } from "../settings/wa_settings.service";
import { callWhatsappApi } from "../wa_axios";
import { UpdateCatalogSchema } from "./catalog.schema";

export async function updateWaCatalog(
  catalogId: string,
  data: UpdateCatalogSchema,
) {
  await prisma.whatsaAppCatalog.update({
    where: {
      catalogId,
    },
    data,
  });
}

export async function getWaCatalog(catalogId) {
  return await prisma.whatsaAppCatalog.findUnique({
    where: {
      catalogId,
    },
    select: {
      catalogId: true,
      vertical: true,
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

  await prisma.whatsaAppCatalog.createMany({
    data: catalogs,
    skipDuplicates: true,
  });
  const existingCatalogs = await prisma.whatsaAppCatalog.findMany({
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
    await prisma.whatsaAppCatalog.deleteMany({
      where: {
        catalogId: {
          in: deletedCatalogs,
        },
      },
    });
  }

  if (updateCatalogs.length) {
    for (const catalog of updateCatalogs) {
      await prisma.whatsaAppCatalog.update({
        where: {
          catalogId: catalog.catalogId,
        },
        data: catalog.data,
      });
    }
  }
}

export async function getWaCatalogsByOrg(orgId) {
  return await prisma.whatsaAppCatalog.findMany({
    where: {
      orgId,
    },
    omit: {
      products: true,
    },
  });
}

export async function getConnectedWaCatalog(orgId) {
  return await prisma.whatsaAppCatalog.findFirst({
    where: {
      orgId,
      isWhatsappConnected: true,
    },
  });
}
