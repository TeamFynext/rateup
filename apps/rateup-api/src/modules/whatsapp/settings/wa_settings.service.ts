import { WhatsappSettings } from "@prisma/client";
import {
  aes_decrypt,
  aes_encrypt,
} from "../../../../utils/encryption/encryption.utils";
import prisma from "../../../utils/prisma";
import {
  createWaSettingsInput,
  updateWaSettingsInput,
} from "./wa_settings.schema";

export async function createWaSettings(
  orgId: string,
  data: createWaSettingsInput,
) {
  const accessToken = data.accessToken;
  const encryptedToken = aes_encrypt(
    accessToken,
    Buffer.from(process.env.wa_access_token_encryption_key, "hex"),
  );
  return await prisma.whatsappSettings.create({
    data: {
      orgId: orgId,
      ...(data as any),
      accessToken: encryptedToken.encryptedData,
      accessToken_iv: encryptedToken.iv,
    },
  });
}

export async function getWaSettings(orgId: string) {
  const res = await prisma.whatsappSettings.findUnique({
    where: {
      orgId: orgId,
    },
  });

  if (!res) {
    return null;
  }

  return getWaSettingsWithAccessTokenDecrypted(res);
}

export async function getWaSettingsByWaBaId(wabaId: string) {
  const res = await prisma.whatsappSettings.findFirst({
    where: {
      wabaId: wabaId,
    },
  });
  if (!res) {
    return null;
  }

  return getWaSettingsWithAccessTokenDecrypted(res);
}

function getWaSettingsWithAccessTokenDecrypted(
  waSettings: WhatsappSettings,
): Omit<WhatsappSettings, "accessToken_iv"> {
  const { accessToken_iv, accessToken, ...data } = waSettings;

  const decryptedToken = aes_decrypt(
    accessToken,
    Buffer.from(process.env.wa_access_token_encryption_key, "hex"),
    accessToken_iv,
  );

  return {
    ...data,
    accessToken: decryptedToken,
  };
}

export async function updateWaSettings(
  orgId: string,
  data: updateWaSettingsInput,
) {
  if (data.accessToken) {
    throw new Error("Cannot update access token"); // TODO
  }
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

export async function deleteWaSettings(orgId: string) {
  return await prisma.whatsappSettings.delete({
    where: {
      orgId: orgId,
    },
  });
}
