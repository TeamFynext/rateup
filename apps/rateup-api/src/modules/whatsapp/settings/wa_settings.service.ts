import prisma from "../../../utils/prisma";
import {
  createWaSettingsInput,
  updateWaSettingsInput,
} from "./wa_settings.schema";

export async function createWaSettings(
  orgId: string,
  data: createWaSettingsInput,
) {
  return await prisma.whatsappSettings.create({
    data: {
      orgId: orgId,
      ...(data as any),
    },
  });
}

export async function getWaSettings(orgId: string) {
  return await prisma.whatsappSettings.findUnique({
    where: {
      orgId: orgId,
    },
  });
}

export async function updateWaSettings(
  orgId: string,
  data: updateWaSettingsInput,
) {
  return await prisma.whatsappSettings.update({
    where: {
      orgId: orgId,
    },
    data: {
      ...(data as any),
    },
  });
}

export async function upsertWaSettings(
  orgId: string,
  data: createWaSettingsInput,
) {
  return await prisma.whatsappSettings.upsert({
    where: {
      orgId: orgId,
    },
    update: {
      ...(data as any),
    },
    create: {
      orgId: orgId,
      ...(data as any),
    },
  });
}
