import { WhatsappSettings } from "@prisma/client";
import { getPhoneDetails } from "../auth/wa_auth.service";
import {
  aes_decrypt,
  aes_encrypt,
} from "../../../../../../../../utils/encryption/encryption.utils";
import prisma from "../../../../../../../utils/prisma";
import { WaConfigType } from "../../../../../../../types/enums";
import { log } from "../../../../../../../utils/logger";

export async function createWaSettings(
  orgId: string,
  data: Omit<
    WhatsappSettings,
    "accessToken_iv" | "encryption" | "orgId" | "phone" | "webhookPassword"
  > & {
    phone?: string;
    webhookPassword?: string;
    encryption?: WaEncryptionKeys;
  },
) {
  const accessToken = data.accessToken;
  if (!data.phone) {
    const { display_phone_number } = await getPhoneDetails(
      data.phoneId,
      accessToken,
    );
    data.phone = display_phone_number;
  }
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

export async function getWaSettings(
  orgId: string,
  whatsappSettingsPhoneId?: string,
) {
  const res = await prisma.whatsappSettings.findFirst({
    where: {
      orgId: orgId,
      ...(whatsappSettingsPhoneId && { phoneId: whatsappSettingsPhoneId }),
    },
  });

  if (!res) {
    return null;
  }

  return getWaSettingsWithAccessTokenDecrypted(res);
}

export async function getAllWaSettings(orgId: string) {
  const res = await prisma.whatsappSettings.findMany({
    where: {
      orgId: orgId,
    },
  });

  if (!res || res.length === 0) {
    return [];
  }

  // Decrypt access token for each setting
  const decryptedSettings = res.map((setting) =>
    getWaSettingsWithAccessTokenDecrypted(setting),
  );

  return decryptedSettings;
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

export async function getWaSettingsByPhoneId(phoneId: string) {
  const res = await prisma.whatsappSettings.findFirst({
    where: {
      phoneId,
    },
  });
  return res;
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
  phoneId: string,
  data: Partial<Omit<WhatsappSettings, "accessToken_iv" | "id" | "orgId">>,
) {
  const dataToBeUpdated: Partial<WhatsappSettings> = data;
  if (data.accessToken) {
    const encryptedToken = aes_encrypt(
      data.accessToken,
      Buffer.from(process.env.wa_access_token_encryption_key, "hex"),
    );
    dataToBeUpdated.accessToken = encryptedToken.encryptedData;
    dataToBeUpdated.accessToken_iv = encryptedToken.iv;
  }
  return await prisma.whatsappSettings.update({
    where: {
      orgId,
      phoneId,
    },
    data: {
      ...dataToBeUpdated,
    },
  });
}

export async function upsertWaSettings(
  orgId: string,
  phoneId: string,
  data: Partial<Omit<WhatsappSettings, "accessToken_iv">>,
) {
  const existingSettings = await prisma.whatsappSettings.findUnique({
    where: {
      orgId,
      phoneId,
    },
  });

  if (existingSettings) {
    return await updateWaSettings(orgId, phoneId, data);
  } else {
    return await createWaSettings(orgId, {
      ...data,
      type: WaConfigType.Manual,
    } as any);
  }
}

export async function deleteWaSettings(orgId: string, phoneId: string) {
  log.trace("Deleting WhatsApp settings for orgId: %s", orgId);
  return await prisma.whatsappSettings.delete({
    where: {
      orgId: orgId,
      phoneId: phoneId,
    },
  });
}

export async function getContactTag(orgId: string) {
  const res = await prisma.waAccountSettings.findFirst({
    where: {
      orgId,
    },
    select: {
      contactTags: true,
    },
  });
  return res;
}

export async function updateContactTag(orgId: string, tags: string[]) {
  const res = await prisma.waAccountSettings.upsert({
    where: {
      orgId,
    },
    create: {
      orgId,
      contactTags: tags,
    },
    update: {
      contactTags: tags,
    },
  });
  return res;
}
