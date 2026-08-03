import { Prisma, WhatsappSettings } from "../../../../generated/prisma/client.js";
import { aes_decrypt, aes_encrypt } from "../../../../utils/encryption/encryption.utils.js";
import prisma from "../../../utils/prisma.js";
import { getPhoneDetails } from "../auth/wa_auth.service.js";
import { WaConfigType, WhatsappSettingsStatus } from "../../../types/enums.js";
import { log } from "../../../utils/logger.js";
import {
  ContactTagSchema,
  ConversationalAutomationInput,
  PaginationQuery,
  updateWaSettingsInput,
} from "./wa_settings.schema.js";
import { callMetaApi } from "../wa_axios.js";
import { subscribePageToApp } from "./wa_settings.controller.js";
import { getChannelScope } from "./wa_channel_access.js";

/**
 * Reads the AES key used to encrypt WhatsApp access tokens at rest from the environment.
 * Throws instead of letting `Buffer.from(undefined, "hex")` fail with an opaque error.
 */
/**
 * Same DbNull translation as `encryption`, for the nullable Instagram profile JSON columns.
 * `undefined` means "leave untouched"; only an explicit `null` clears the column.
 */
function jsonOrDbNull<T>(value: T | null | undefined): T | typeof Prisma.DbNull | undefined {
  if (value === null) return Prisma.DbNull;
  return value;
}

function getEncryptionKey(): Buffer {
  const key = process.env.wa_access_token_encryption_key;
  if (!key) {
    throw new Error("wa_access_token_encryption_key is not configured");
  }
  return Buffer.from(key, "hex");
}

export async function createWaSettings(
  orgId: string,
  data: Partial<Omit<WhatsappSettings, "id" | "orgId" | "accessToken_iv">> &
    Pick<WhatsappSettings, "accessToken" | "appId" | "type">,
) {
  const accessToken = data.accessToken;
  if (!accessToken) {
    throw new Error("accessToken is required to create WhatsApp settings");
  }
  // Prisma's JSON-typed update/create input distinguishes "SQL NULL" (Prisma.DbNull) from a
  // literal JSON null (Prisma.JsonNull); a bare `null` is rejected by the generated types for
  // custom-typed (PrismaJson) JSON columns like `encryption`, so it has to be translated here.
  const encryption: Prisma.WhatsappSettingsUncheckedCreateInput["encryption"] =
    data.encryption === null ? Prisma.DbNull : data.encryption;
  const instagramIceBreakers = jsonOrDbNull(data.instagramIceBreakers);
  const instagramPersistentMenu = jsonOrDbNull(data.instagramPersistentMenu);
  const conversionData = jsonOrDbNull(data.conversionData);

  if (data.phoneId) {
    if (!data.phone) {
      const { display_phone_number } = await getPhoneDetails(data.phoneId, accessToken);
      data.phone = display_phone_number?.replace(/\s+/g, "");
    }
    const encryptedToken = aes_encrypt(accessToken, getEncryptionKey());
    return await prisma.whatsappSettings.create({
      data: {
        orgId,
        ...data,
        encryption,
        instagramIceBreakers,
        instagramPersistentMenu,
        conversionData,
        accessToken: encryptedToken.encryptedData,
        accessToken_iv: encryptedToken.iv,
      },
    });
  } else {
    return await prisma.whatsappSettings.create({
      data: {
        orgId,
        ...data,
        encryption,
        instagramIceBreakers,
        instagramPersistentMenu,
        conversionData,
        accessToken,
      },
    });
  }
}

export async function getWaSettings(orgId: string, whatsappSettingsPhoneId?: string) {
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

export async function getWaSettingsById(whatsappSettingsId: string) {
  const res = await prisma.whatsappSettings.findUnique({
    where: {
      id: whatsappSettingsId,
    },
  });

  if (!res) {
    return null;
  }

  return res.wabaId ? getWaSettingsWithAccessTokenDecrypted(res) : res;
}

export async function getAllWaSettings(orgId: string) {
  const res = await prisma.whatsappSettings.findMany({
    where: {
      orgId: orgId,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  if (!res || res.length === 0) {
    return [];
  }

  // Decrypt access token for each setting
  const decryptedSettings = res.map((setting) => getWaSettingsWithAccessTokenDecrypted(setting));

  return decryptedSettings;
}

/**
 * The org's channels, narrowed to what the caller's teams reach.
 *
 * This backs `GET /api/wa/settings`, which is the only endpoint the dashboard uses to populate
 * channel pickers — so narrowing here narrows every `AccountSelector` in the UI, and also every
 * `waSettings[0]` default, without any frontend change.
 */
export async function getAccessibleWaSettings(orgId: string, userId: string, role: string) {
  if (role === "SUPER_ADMIN") return await getAllWaSettings(orgId);

  const scope = await getChannelScope(orgId, userId);
  if (scope.all === true) return await getAllWaSettings(orgId);

  const res = await prisma.whatsappSettings.findMany({
    where: { orgId, id: { in: Array.from(scope.ids) } },
    orderBy: { createdAt: "asc" },
  });

  return res.map((setting) => getWaSettingsWithAccessTokenDecrypted(setting));
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
    orderBy: {
      createdAt: "asc",
    },
  });
  return res ? getWaSettingsWithAccessTokenDecrypted(res) : null;
}

export async function getWaSettingsByIbaId(ibaId: string) {
  const res = await prisma.whatsappSettings.findFirst({
    where: {
      ibaId,
    },
    orderBy: {
      createdAt: "asc",
    },
  });
  if (!res) return null;
  return res.wabaId ? getWaSettingsWithAccessTokenDecrypted(res) : res;
}

export async function getWaSettingsByPageId(pageId: string) {
  const res = await prisma.whatsappSettings.findFirst({
    where: {
      fbPageId: pageId,
    },
    orderBy: {
      createdAt: "asc",
    },
  });
  if (!res) return null;
  return getWaSettingsWithAccessTokenDecrypted(res);
}

export function getWaSettingsWithAccessTokenDecrypted(
  waSettings: WhatsappSettings,
): Omit<WhatsappSettings, "accessToken_iv"> {
  const { accessToken_iv, accessToken, ...data } = waSettings;

  // `accessToken_iv` is a nullable column; a row with none can't be decrypted, and letting
  // `Buffer.from` throw its own TypeError on a non-string keeps the crash the same shape it
  // already had for these rows, rather than silently proceeding with a bad key.
  if (typeof accessToken_iv !== "string") {
    throw new TypeError("The first argument must be of type string");
  }

  const decryptedToken = aes_decrypt(accessToken, getEncryptionKey(), accessToken_iv);

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
  const dataToBeUpdated: Prisma.WhatsappSettingsUncheckedUpdateInput = {
    ...data,
    // See the comment in createWaSettings: a bare `null` isn't valid for this custom-typed
    // JSON column in Prisma's update input, it has to be the DbNull sentinel.
    encryption: data.encryption === null ? Prisma.DbNull : data.encryption,
    instagramIceBreakers: jsonOrDbNull(data.instagramIceBreakers),
    instagramPersistentMenu: jsonOrDbNull(data.instagramPersistentMenu),
    conversionData: jsonOrDbNull(data.conversionData),
  };
  if (data.accessToken) {
    const encryptedToken = aes_encrypt(data.accessToken, getEncryptionKey());
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

/**
 * The `encryption` sub-schema in `wa_settings.schema.ts` accepts each key independently
 * (so a request can be validated field-by-field), but the stored `WaEncryptionKeys` shape
 * needs all three together to be usable for WhatsApp Flow message encryption. This checks
 * that a value that's about to be persisted is actually complete, rather than writing a
 * half-populated object that would silently break the next flow send.
 */
function isCompleteEncryptionKeys(value: object): value is WaEncryptionKeys {
  const v = value as Record<string, unknown>;
  return (
    typeof v.publicKey === "string" &&
    typeof v.privateKey === "string" &&
    typeof v.passphrase === "string"
  );
}

export async function updateWaSettingsById(
  whatsappSettingsId: string,
  data: updateWaSettingsInput,
) {
  let encryption: Prisma.WhatsappSettingsUncheckedUpdateInput["encryption"];
  if (data.encryption === null) {
    encryption = Prisma.DbNull;
  } else if (data.encryption !== undefined) {
    if (!isCompleteEncryptionKeys(data.encryption)) {
      throw new Error(
        "encryption keys must include publicKey, privateKey, and passphrase together",
      );
    }
    encryption = data.encryption;
  }

  return await prisma.whatsappSettings.update({
    where: {
      id: whatsappSettingsId,
    },
    data: {
      ...data,
      encryption,
      instagramIceBreakers: jsonOrDbNull(data.instagramIceBreakers),
      instagramPersistentMenu: jsonOrDbNull(data.instagramPersistentMenu),
      conversionData: jsonOrDbNull(data.conversionData),
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
    if (data.fbPageId?.length) {
      if (!data.pageAccessToken) {
        throw new Error("pageAccessToken is required to connect a Facebook page");
      }
      await subscribePageToApp(data.fbPageId, data.pageAccessToken, [
        "messages",
        "message_reads",
        "message_reactions",
      ]);
      const { accessToken } = getWaSettingsWithAccessTokenDecrypted(existingSettings);
      if (data.ibaId) {
        const igData = await callMetaApi(
          `/${data.ibaId}?fields=username&access_token=${accessToken}`,
          "GET",
        );
        data.igUserName = igData.data.username;
      }
      const fbData = await callMetaApi(
        `/${data.fbPageId}?fields=name&access_token=${accessToken}`,
        "GET",
      );
      data.fbUserName = fbData.data.name;
    }
    if (!data.fbPageId?.length && existingSettings.fbPageId?.length) {
      data.fbPageId = null;
      data.ibaId = null;
      data.pageAccessToken = null;
      data.igUserName = null;
      data.igDisplayName = null;
      data.fbUserName = null;
    }
    return await updateWaSettings(orgId, phoneId, data);
  } else {
    // Only a genuine "first connection" reaches this branch, and unlike an update, creating a
    // WhatsApp channel from scratch always needs its own access token and Meta app id.
    if (!data.accessToken || !data.appId) {
      throw new Error("accessToken and appId are required to create a new WhatsApp channel");
    }
    return await createWaSettings(orgId, {
      ...data,
      accessToken: data.accessToken,
      appId: data.appId,
      type: WaConfigType.Manual,
    });
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
  });
  return res;
}

export async function updateContactTag(orgId: string, body: ContactTagSchema) {
  const res = await prisma.waAccountSettings.upsert({
    where: {
      orgId,
    },
    create: {
      orgId,
      contactTags: body.tags,
      contactGroupTags: body.groupTags,
    },
    update: {
      contactTags: body.tags,
      contactGroupTags: body.groupTags,
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
    orderBy: [{ createdAt: desc }, { phone: desc }],
    skip: page && limit ? Number(page) * Number(limit) : undefined,
    take: limit ? Number(limit) : undefined,
  });
  return { totalCount, logs };
}

/** These four cover the handful of Graph API fields the onboarding sync flow reads or writes
 * back — the calls themselves ask Meta for exactly these fields, nothing more. */
export interface MetaGraphPage {
  id: string;
  name: string;
  access_token: string;
  instagram_business_account?: { id: string };
}
export interface MetaGraphAd {
  id: string;
  name?: string;
}
export interface MetaGraphAdAccount {
  id: string;
  name?: string;
  ads?: MetaGraphAd[];
}
export interface MetaGraphDataset {
  id: string;
  name?: string;
}

export async function getFbPagesFromWa(settingsId: string): Promise<MetaGraphPage[]> {
  const settings = await getWaSettingsById(settingsId);
  if (!settings?.accessToken) {
    throw new Error("accesstoken not found");
  }
  const { accessToken } = settings;
  const url = `/me/accounts?fields=id,name,access_token,instagram_business_account&access_token=${accessToken}`;
  const res = await callMetaApi(url, "GET");
  log.info("Pages fetched from meta:%o", res?.data);
  return res.data?.data;
}

export async function getAdsFromWa(
  whatsappSettingsId: string,
  adAccountId: string,
): Promise<MetaGraphAd[]> {
  const settings = await getWaSettingsById(whatsappSettingsId);
  if (!settings?.accessToken) {
    throw new Error("accesstoken not found");
  }
  const { accessToken } = settings;
  const url = `/${adAccountId}/ads?fields=id,name&access_token=${accessToken}`;
  const res = await callMetaApi(url, "GET");
  return res.data?.data;
}

export async function getAdAccountsFromWa(
  whatsappSettingsId: string,
): Promise<MetaGraphAdAccount[]> {
  const settings = await getWaSettingsById(whatsappSettingsId);
  if (!settings?.accessToken) {
    throw new Error("accesstoken not found");
  }
  const { accessToken } = settings;
  const url = `/me/adaccounts?fields=id,name&access_token=${accessToken}`;
  const res = await callMetaApi(url, "GET");
  const adAccounts: MetaGraphAdAccount[] = [...(res.data?.data || [])];
  for (const acc of adAccounts) {
    const ads = await callMetaApi(
      `/${acc?.id}/ads?fields=id,name&access_token=${accessToken}`,
      "GET",
    );
    acc.ads = ads.data.data;
  }
  return adAccounts;
}

export async function getMetaDatasetsFromWa(
  whatsappSettingsId: string,
): Promise<MetaGraphDataset[]> {
  const settings = await getWaSettingsById(whatsappSettingsId);
  if (!settings?.accessToken) {
    throw new Error("accesstoken not found");
  }
  const { accessToken } = settings;

  let datasets: MetaGraphDataset[] = [];

  try {
    const businessesUrl = `/me/businesses?fields=id,name&access_token=${accessToken}`;
    const businessesRes = await callMetaApi(businessesUrl, "GET");
    console.log("businessres:", businessesRes.data);
    const businesses = businessesRes.data?.data || [];

    for (const business of businesses) {
      try {
        const pixelsUrl = `/${business.id}/adspixels?fields=id,name&access_token=${accessToken}`;
        const pixelsRes = await callMetaApi(pixelsUrl, "GET");
        console.log("pixelREs", pixelsRes);
        if (pixelsRes.data?.data) {
          datasets = [...datasets, ...pixelsRes.data.data];
        }
      } catch {
        log.warn("Failed to fetch pixels for business %s", business.id);
      }
    }
  } catch {
    log.warn("Failed to fetch businesses");
  }

  try {
    const adAccountsUrl = `/me/adaccounts?fields=id,name&access_token=${accessToken}`;
    const adAccountsRes = await callMetaApi(adAccountsUrl, "GET");
    console.log("adAccountsRes:", adAccountsRes.data);
    const adAccounts = adAccountsRes.data?.data || [];

    for (const acc of adAccounts) {
      try {
        const pixelsUrl = `/${acc.id}/adspixels?fields=id,name&access_token=${accessToken}`;
        const pixelsRes = await callMetaApi(pixelsUrl, "GET");
        console.log("adAccount pixelsRes:", pixelsRes.data);
        if (pixelsRes.data?.data) {
          datasets = [...datasets, ...pixelsRes.data.data];
        }
      } catch {
        log.warn("Failed to fetch pixels for ad account %s", acc.id);
      }
    }
  } catch {
    log.warn("Failed to fetch ad accounts");
  }

  // Deduplicate
  const uniqueDatasets = Array.from(new Map(datasets.map((item) => [item.id, item])).values());
  return uniqueDatasets;
}

export interface MetaGraphLeadgenForm {
  id: string;
  name: string;
  questions?: unknown[];
}

export async function getLeadgenFormsFromWa(
  fbPageId: string,
  pageAccessToken: string,
): Promise<MetaGraphLeadgenForm[]> {
  const url = `/${fbPageId}/leadgen_forms?fields=id,name,questions&access_token=${pageAccessToken}`;
  const res = await callMetaApi(url, "GET");
  return res.data.data;
}

export async function subscribeFieldtoPage(
  fbPageId: string,
  pageAccessToken: string,
  fields: string[],
) {
  const url = `/${fbPageId}/subscribed_apps?subscribed_fields=${fields.join(",")}&access_token=${pageAccessToken}`;
  const res = await callMetaApi(url, "POST");
  return res.data;
}

export async function getLeadgenFormQuestionsFromWa(
  fbPageId: string,
  leadgenFormId: string,
  pageAccessToken: string,
): Promise<Array<Record<string, unknown>>> {
  const url = `/${fbPageId}/${leadgenFormId}?fields=questions&access_token=${pageAccessToken}`;
  const res = await callMetaApi(url, "GET");
  return res.data?.data;
}

export async function syncMetaAssetstoDb(
  key: "pages" | "adAccounts" | "leads" | "leadgenForms",
  data: Prisma.InputJsonValue[],
  whatsappSettingsId: string,
) {
  await prisma.metaAssets.upsert({
    where: {
      whatsappSettingsId,
    },
    create: {
      whatsappSettingsId,
      [key]: data,
    },
    update: {
      [key]: data,
    },
  });
}

export interface MetaAsset {
  whatsappSettingsId: string;
  pages: {
    id: string;
    name: string;
    access_token: string;
    instagram_business_account: {
      id: string;
    };
    subscribedFields: string[];
    pageAccessTokenByUser?: string;
  }[];
  adAccounts: {
    id: string;
    // Meta omits the name on accounts/ads the token cannot read.
    name?: string;
    ads?: {
      id: string;
      name?: string;
    }[];
  }[];
  leads: {
    created_time: string;
    id: string;
    ad_id: string;
    form_id: string;
    field_data: {
      name: string;
      values: string[];
    }[];
  }[];
  leadgenForms: {
    pageId: string;
    id: string;
    name: string;
    /** Meta's form question descriptors; stored verbatim, never read field-by-field. */
    questions: Array<Record<string, unknown>>;
  }[];
}

export async function getMetaAssets(whatsappSettingsId: string) {
  return (await prisma.metaAssets.findUnique({
    where: {
      whatsappSettingsId,
    },
  })) as unknown as MetaAsset;
}

export async function getConversationalAutomation(orgId: string, phoneId: string) {
  const settings = await prisma.whatsappSettings.findFirst({
    where: { orgId, phoneId },
    select: { conversationalAutomation: true },
  });
  if (!settings) throw new Error("WhatsApp settings not found");

  return (
    (settings.conversationalAutomation as ConversationalAutomationInput) ?? {
      commands: [],
      prompts: [],
    }
  );
}

export async function syncConversationalAutomation(orgId: string, phoneId: string) {
  const settings = await getWaSettings(orgId, phoneId);
  if (!settings) throw new Error("WhatsApp settings not found");

  const res = await callMetaApi(
    `/${phoneId}`,
    "GET",
    settings.accessToken,
    undefined,
    {},
    {},
    { fields: "conversational_automation" },
  );
  const automation = res.data?.conversational_automation ?? {
    commands: [],
    prompts: [],
  };

  await prisma.whatsappSettings.update({
    where: { phoneId },
    data: { conversationalAutomation: automation },
  });

  return automation;
}

export async function updateConversationalAutomation(
  orgId: string,
  phoneId: string,
  data: ConversationalAutomationInput,
) {
  const settings = await getWaSettings(orgId, phoneId);
  if (!settings) throw new Error("WhatsApp settings not found");

  const params: Record<string, string> = {};
  if (data.commands) {
    params.commands = JSON.stringify(data.commands);
  }
  if (data.prompts) {
    params.prompts = JSON.stringify(data.prompts);
  }

  const res = await callMetaApi(
    `/${phoneId}/conversational_automation`,
    "POST",
    settings.accessToken,
    undefined,
    {},
    {},
    params,
  );

  await prisma.whatsappSettings.update({
    where: { phoneId },
    data: { conversationalAutomation: data },
  });

  return res.data;
}

export async function getWaSettingsByPhone(phone: string) {
  return await prisma.whatsappSettings.findFirst({
    where: {
      phone,
    },
  });
}

export async function updateWaSettingsStatus(phoneId: string, status: WhatsappSettingsStatus) {
  return await prisma.whatsappSettings.update({
    where: { phoneId },
    data: { status },
  });
}

export async function updateWaSettingsStatusByWabaId(
  wabaId: string,
  status: WhatsappSettingsStatus,
) {
  return await prisma.whatsappSettings.updateMany({
    where: { wabaId },
    data: { status },
  });
}
