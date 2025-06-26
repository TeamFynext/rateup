import { WhatsappSettings } from "@prisma/client";
import {
  aes_decrypt,
  aes_encrypt,
} from "../../../../utils/encryption/encryption.utils";
import prisma from "../../../utils/prisma";
import { getPhoneDetails } from "../auth/wa_auth.service";
import { WaConfigType } from "../../../types/enums";
import { log } from "../../../utils/logger";
import { PaginationQuery } from "./wa_settings.schema";
import { callWhatsappApi } from "../wa_axios";

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

export async function getWaLogs(orgId: string, query: PaginationQuery) {
  const { page, limit, desc = "desc", phone } = query;
  const totalCount = await prisma.waLogs.count({
    where: {
      orgId,
    },
  });
  const logs = await prisma.waLogs.findMany({
    where: {
      orgId,
      phone: phone ? { contains: phone } : undefined,
    },
    orderBy: {
      createdAt: desc,
    },
    skip: page && limit ? Number(page) * Number(limit) : undefined,
    take: limit ? Number(limit) : undefined,
  });
  return { totalCount, logs };
}

export async function getFbPagesFromWa(orgId) {
  const { accessToken } = await getWaSettings(orgId);
  if (!accessToken) {
    throw new Error("accesstoken not found");
  }
  const url = `/me/accounts?fields=id,name,access_token&access_token=${accessToken}`;
  const res = await callWhatsappApi(url, "GET");
  return res.data?.data;
}

export async function getAdsFromWa(orgId, adAccountId) {
  const { accessToken } = await getWaSettings(orgId);
  if (!accessToken) {
    throw new Error("accesstoken not found");
  }
  const url = `/${adAccountId}/ads?fields=id,name&access_token=${accessToken}`;
  const res = await callWhatsappApi(url, "GET");
  return res.data?.data;
}

export async function getAdAccountsFromWa(orgId) {
  const { accessToken } = await getWaSettings(orgId);
  if (!accessToken) {
    throw new Error("accesstoken not found");
  }
  const url = `/me/adaccounts?fields=id,name&access_token=${accessToken}`;
  const res = await callWhatsappApi(url, "GET");
  const adAccounts = [...res.data?.data];
  for (const acc of adAccounts) {
    const ads = await callWhatsappApi(
      `/${acc?.id}/ads?fields=id,name&access_token=${accessToken}`,
      "GET",
    );
    acc.ads = ads.data.data;
  }
  return adAccounts;
}

export async function getLeadgenFormsFromWa(fbPageId, pageAccessToken) {
  const url = `/${fbPageId}/leadgen_forms?fields=id,name,questions&access_token=${pageAccessToken}`;
  const res = await callWhatsappApi(url, "GET");
  return res.data.data;
}

export async function subscribeFieldtoPage(fbPageId, pageAccessToken, fields) {
  const url = `/${fbPageId}/subscribed_apps?subscribed_fields=${fields.join(",")}&access_token=${pageAccessToken}`;
  const res = await callWhatsappApi(url, "POST");
  return res.data?.data;
}

export async function getLeadgenFormQuestionsFromWa(
  fbPageId,
  leadgenFormId,
  pageAccessToken,
) {
  const url = `/${fbPageId}/${leadgenFormId}/leadgen_forms?fields=questions&access_token=${pageAccessToken}`;
  const res = await callWhatsappApi(url, "GET");
  return res.data?.data;
}

export async function syncMetaAssetstoDb(key, data, orgId) {
  await prisma.metaAssets.upsert({
    where: {
      orgId,
    },
    create: {
      orgId,
      [key]: data,
    },
    update: {
      [key]: data,
    },
  });
}

export interface MetaAsset {
  orgId: string;
  pages: {
    id: string;
    name: string;
    access_token: string;
    subscribedFields: string[];
  }[];
  adAccounts: {
    id: string;
    name: string;
    ads: {
      id: string;
      name: string;
    }[];
  }[];
  leads: {
    created_time: string;
    id: string;
    ad_id: string;
    form_id: string;
    field_data: {
      name: string;
      values: any[];
    }[];
  }[];
  leadgenForms: {
    pageId: string;
    id: string;
    name: string;
    questions: any[];
  }[];
}

export async function getMetaAssets(orgId: string) {
  return (await prisma.metaAssets.findUnique({
    where: {
      orgId,
    },
  })) as unknown as MetaAsset;
}
