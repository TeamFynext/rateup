import prisma from "../../../utils/prisma";
import { getWaSettings } from "../settings/wa_settings.service";
import { callWhatsappApi } from "../wa_axios";

export async function connectWaCatalog(catalogId, orgId, vertical) {
  return await prisma.whatsaAppCatalog.upsert({
    where: {
      orgId,
    },
    create: {
      catalogId,
      orgId,
      vertical,
    },
    update: {
      catalogId,
      vertical,
    },
  });
}

export async function getWaCatalog(orgId) {
  return await prisma.whatsaAppCatalog.findUnique({
    where: {
      orgId,
    },
    select: {
      catalogId: true,
      vertical: true,
    },
  });
}
