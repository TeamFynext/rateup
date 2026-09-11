import { Prisma, WhatsappSettings } from "../../../../generated/prisma/client.js";
import { aes_decrypt, aes_encrypt } from "../../../../utils/encryption/encryption.utils.js";
import prisma from "../../../utils/prisma.js";
import { getPhoneDetails, registerPhoneNumber } from "../auth/wa_auth.service.js";
import { WaConfigType, WhatsappSettingsStatus } from "../../../types/enums.js";
import { log } from "../../../utils/logger.js";
import {
  BusinessProfileInput,
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

  if (data.phoneId && !data.phone) {
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
      pageAccessToken: data.pageAccessToken ? encryptInlineToken(data.pageAccessToken) : undefined,
    },
  });
}

/**
 * Settings for one of the org's WhatsApp channels, or — with no phone id — the org
 * default channel.
 *
 * The default is the oldest row, not "whichever row Postgres happened to return
 * first". Callers derive a `wabaId` from this, and Meta scopes flows and templates to
 * a WABA, so an unstable default silently spreads an org's assets across its numbers.
 * The `WaFlow.whatsappSettingsId` backfill picks the same row.
 */
export async function getWaSettings(orgId: string, whatsappSettingsPhoneId?: string) {
  const res = await prisma.whatsappSettings.findFirst({
    where: {
      orgId: orgId,
      ...(whatsappSettingsPhoneId && { phoneId: whatsappSettingsPhoneId }),
    },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  });

  if (!res) {
    return null;
  }

  return getWaSettingsWithAccessTokenDecrypted(res);
}

export async function getWaSettingsById(whatsappSettingsId: string, orgId: string) {
  const res = await prisma.whatsappSettings.findFirst({
    where: {
      id: whatsappSettingsId,
      orgId,
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
  return getWaSettingsWithAccessTokenDecrypted(res);
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

/**
 * Encrypts a token that has no IV column of its own, storing the IV inline as
 * `<iv>:<ciphertext>`.
 *
 * Used for pageAccessToken, which was never encrypted at all (13.5) and has no
 * `pageAccessToken_iv` column. The inline form is self-describing, so no schema
 * change and no backfill are needed: a legacy plaintext value simply does not
 * match the prefix and is returned as-is by decryptInlineToken.
 */
const INLINE_IV_PATTERN = /^([0-9a-f]{32}):(.*)$/;

export function encryptInlineToken(value: string): string {
  const { encryptedData, iv } = aes_encrypt(value, getEncryptionKey());
  return `${iv}:${encryptedData}`;
}

function decryptInlineToken(value: string | null): string | null {
  if (!value) return value;
  const match = INLINE_IV_PATTERN.exec(value);
  // Not in the encrypted form — a row written before 13.5. Returned verbatim so
  // existing channels keep working; it is encrypted on its next write.
  if (!match) return value;
  try {
    return aes_decrypt(match[2], getEncryptionKey(), match[1]);
  } catch (error) {
    log.error({ err: error }, "Could not decrypt a stored page access token");
    return value;
  }
}

export function getWaSettingsWithAccessTokenDecrypted(
  waSettings: WhatsappSettings,
): Omit<WhatsappSettings, "accessToken_iv"> {
  const { accessToken_iv, accessToken, pageAccessToken, ...data } = waSettings;

  let decryptedToken = accessToken;
  if (accessToken && typeof accessToken_iv === "string" && accessToken_iv.length > 0) {
    try {
      decryptedToken = aes_decrypt(accessToken, getEncryptionKey(), accessToken_iv);
    } catch (error) {
      log.error({ err: error, settingsId: waSettings.id }, "Could not decrypt an access token");
    }
  }

  return {
    ...data,
    accessToken: decryptedToken,
    pageAccessToken: decryptInlineToken(pageAccessToken),
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
  if (data.pageAccessToken) {
    dataToBeUpdated.pageAccessToken = encryptInlineToken(data.pageAccessToken);
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
  orgId: string,
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

  const dataToBeUpdated: Prisma.WhatsappSettingsUncheckedUpdateInput = {
    ...data,
    encryption,
    instagramIceBreakers: jsonOrDbNull(data.instagramIceBreakers),
    instagramPersistentMenu: jsonOrDbNull(data.instagramPersistentMenu),
    conversionData: jsonOrDbNull(data.conversionData),
  };
  if (data.accessToken) {
    const encryptedToken = aes_encrypt(data.accessToken, getEncryptionKey());
    dataToBeUpdated.accessToken = encryptedToken.encryptedData;
    dataToBeUpdated.accessToken_iv = encryptedToken.iv;
  }
  if (data.pageAccessToken) {
    dataToBeUpdated.pageAccessToken = encryptInlineToken(data.pageAccessToken);
  }

  return await prisma.whatsappSettings.update({
    where: {
      id: whatsappSettingsId,
      orgId,
    },
    data: dataToBeUpdated,
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
      const { accessToken, pageAccessToken: storedPageToken } =
        getWaSettingsWithAccessTokenDecrypted(existingSettings);
      // The dashboard no longer receives pageAccessToken in the channel list (13.2), so a
      // save that keeps the connected page can't send it back — fall back to the stored
      // one. Switching to a different page still needs that page's own token.
      const pageAccessToken =
        data.pageAccessToken ??
        (data.fbPageId === existingSettings.fbPageId ? storedPageToken : null);
      if (!pageAccessToken) {
        throw new Error("pageAccessToken is required to connect a Facebook page");
      }
      await subscribePageToApp(data.fbPageId, pageAccessToken, [
        "messages",
        "message_reads",
        "message_reactions",
      ]);
      if (data.ibaId) {
        const igData = await callMetaApi(`/${data.ibaId}?fields=username`, "GET", accessToken);
        data.igUserName = igData.data.username;
      } else if ((data.ibaId === null || data.ibaId === "") && existingSettings.ibaId) {
        // Disconnecting Instagram alone: the Page (and Messenger on it) stays connected.
        data.ibaId = null;
        data.igUserName = null;
        data.igDisplayName = null;
      }
      const fbData = await callMetaApi(`/${data.fbPageId}?fields=name`, "GET", accessToken);
      data.fbUserName = fbData.data.name;
    }
    // Only an explicit empty fbPageId disconnects the Page. Leaving the field out of a
    // partial update must not silently drop the Messenger and Instagram connections.
    // Instagram hangs off the Page, so it goes with it.
    if ((data.fbPageId === null || data.fbPageId === "") && existingSettings.fbPageId?.length) {
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

/** These four cover the handful of Graph API fields the onboarding sync flow reads or writes
 * back — the calls themselves ask Meta for exactly these fields, nothing more. */
export interface MetaGraphPage {
  id: string;
  name: string;
  access_token: string;
  /** Page profile picture. A signed CDN URL that expires, so it's refreshed on every sync. */
  pictureUrl?: string;
  instagram_business_account?: {
    id: string;
    username?: string;
    /** Same caveat as `pictureUrl` — signed and short-lived. */
    profile_picture_url?: string;
  };
}

/** `/me/accounts` as Meta returns it, before `picture` is flattened to `pictureUrl`. */
interface MetaGraphAccount extends Omit<MetaGraphPage, "pictureUrl"> {
  picture?: { data?: { url?: string } };
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

export async function getFbPagesFromWa(
  settingsId: string,
  orgId: string,
): Promise<MetaGraphPage[]> {
  const settings = await getWaSettingsById(settingsId, orgId);
  if (!settings?.accessToken) {
    throw new Error("accesstoken not found");
  }
  const { accessToken } = settings;
  const url = `/me/accounts?fields=id,name,access_token,picture.type(large){url},instagram_business_account`;
  const res = await callMetaApi(url, "GET", accessToken);
  const accounts = res.data?.data as MetaGraphAccount[] | undefined;
  log.trace({ pages: accounts?.map((page) => page.id) }, "Pages fetched from meta");
  if (!accounts) return [];

  return Promise.all(
    accounts.map(async ({ picture, ...page }) => ({
      ...page,
      pictureUrl: picture?.data?.url,
      instagram_business_account: page.instagram_business_account
        ? await getInstagramProfile(page.instagram_business_account.id, accessToken)
        : undefined,
    })),
  );
}

// Fetched per account rather than expanded inside `/me/accounts`: if the token lacks
// instagram_basic, an expansion would fail the whole page list, while this only costs
// the picture. Pages without the picture still sync.
async function getInstagramProfile(
  ibaId: string,
  accessToken: string,
): Promise<NonNullable<MetaGraphPage["instagram_business_account"]>> {
  try {
    const res = await callMetaApi(
      `/${ibaId}?fields=username,profile_picture_url`,
      "GET",
      accessToken,
    );
    return {
      id: ibaId,
      username: res.data?.username,
      profile_picture_url: res.data?.profile_picture_url,
    };
  } catch (err) {
    log.warn({ err, ibaId }, "Could not read Instagram profile for page sync");
    return { id: ibaId };
  }
}

export async function getAdsFromWa(
  whatsappSettingsId: string,
  adAccountId: string,
  orgId: string,
): Promise<MetaGraphAd[]> {
  const settings = await getWaSettingsById(whatsappSettingsId, orgId);
  if (!settings?.accessToken) {
    throw new Error("accesstoken not found");
  }
  const { accessToken } = settings;
  const res = await callMetaApi(`/${adAccountId}/ads?fields=id,name`, "GET", accessToken);
  return res.data?.data;
}

export async function getAdAccountsFromWa(
  whatsappSettingsId: string,
  orgId: string,
): Promise<MetaGraphAdAccount[]> {
  const settings = await getWaSettingsById(whatsappSettingsId, orgId);
  if (!settings?.accessToken) {
    throw new Error("accesstoken not found");
  }
  const { accessToken } = settings;
  const res = await callMetaApi(`/me/adaccounts?fields=id,name`, "GET", accessToken);
  const adAccounts: MetaGraphAdAccount[] = [...(res.data?.data || [])];
  for (const acc of adAccounts) {
    const ads = await callMetaApi(`/${acc?.id}/ads?fields=id,name`, "GET", accessToken);
    acc.ads = ads.data.data;
  }
  return adAccounts;
}

export async function getMetaDatasetsFromWa(
  whatsappSettingsId: string,
  orgId: string,
): Promise<MetaGraphDataset[]> {
  const settings = await getWaSettingsById(whatsappSettingsId, orgId);
  if (!settings?.accessToken) {
    throw new Error("accesstoken not found");
  }
  const { accessToken } = settings;

  let datasets: MetaGraphDataset[] = [];

  try {
    const businessesRes = await callMetaApi(`/me/businesses?fields=id,name`, "GET", accessToken);
    const businesses = businessesRes.data?.data || [];

    for (const business of businesses) {
      try {
        const pixelsRes = await callMetaApi(
          `/${business.id}/adspixels?fields=id,name`,
          "GET",
          accessToken,
        );
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
    const adAccountsRes = await callMetaApi(`/me/adaccounts?fields=id,name`, "GET", accessToken);
    const adAccounts = adAccountsRes.data?.data || [];

    for (const acc of adAccounts) {
      try {
        const pixelsRes = await callMetaApi(
          `/${acc.id}/adspixels?fields=id,name`,
          "GET",
          accessToken,
        );
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
  const res = await callMetaApi(
    `/${fbPageId}/leadgen_forms?fields=id,name,questions`,
    "GET",
    pageAccessToken,
  );
  return res.data.data;
}

export async function subscribeFieldtoPage(
  fbPageId: string,
  pageAccessToken: string,
  fields: string[],
) {
  const res = await callMetaApi(
    `/${fbPageId}/subscribed_apps?subscribed_fields=${fields.join(",")}`,
    "POST",
    pageAccessToken,
  );
  return res.data;
}

export async function getLeadgenFormQuestionsFromWa(
  fbPageId: string,
  leadgenFormId: string,
  pageAccessToken: string,
): Promise<Array<Record<string, unknown>>> {
  const res = await callMetaApi(
    `/${fbPageId}/${leadgenFormId}?fields=questions`,
    "GET",
    pageAccessToken,
  );
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
    pictureUrl?: string;
    instagram_business_account: {
      id: string;
      username?: string;
      profile_picture_url?: string;
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

export async function getMetaAssets(
  whatsappSettingsId: string,
  orgId: string,
): Promise<MetaAsset | null> {
  const settings = await prisma.whatsappSettings.findFirst({
    where: { id: whatsappSettingsId, orgId },
    select: { id: true },
  });
  if (!settings) return null;

  return (await prisma.metaAssets.findUnique({
    where: {
      whatsappSettingsId,
    },
  })) as unknown as MetaAsset | null;
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

/**
 * A business phone number's display name and where it is in Meta's review process.
 *
 * `verifiedName` is the name that undergoes verification; `nameStatus` says whether it is
 * approved. A change that is still under review shows up as `newDisplayName` /
 * `newNameStatus` until Meta decides, and only lands on the number once it is approved
 * *and* the number is re-registered.
 *
 * This is Meta's name, not ours: it is always read live and never written to
 * `phoneDisplayName`, which is the org's own label for the channel and is theirs to set.
 */
export interface DisplayNameStatus {
  verifiedName: string | null;
  nameStatus: string | null;
  newDisplayName: string | null;
  newNameStatus: string | null;
}

export async function syncDisplayName(orgId: string, phoneId: string): Promise<DisplayNameStatus> {
  const settings = await getWaSettings(orgId, phoneId);
  if (!settings) throw new Error("WhatsApp settings not found");

  const res = await callMetaApi(
    `/${phoneId}`,
    "GET",
    settings.accessToken,
    undefined,
    {},
    {},
    { fields: "verified_name,name_status,new_display_name,new_name_status" },
  );

  return {
    verifiedName: res.data?.verified_name ?? null,
    nameStatus: res.data?.name_status ?? null,
    newDisplayName: res.data?.new_display_name ?? null,
    newNameStatus: res.data?.new_name_status ?? null,
  };
}

/** Submits a new display name to Meta for review, and reports where the request landed. */
export async function updateDisplayName(
  orgId: string,
  phoneId: string,
  newDisplayName: string,
): Promise<DisplayNameStatus> {
  const settings = await getWaSettings(orgId, phoneId);
  if (!settings) throw new Error("WhatsApp settings not found");

  await callMetaApi(
    `/${phoneId}`,
    "POST",
    settings.accessToken,
    undefined,
    {},
    {},
    { new_display_name: newDisplayName },
  );

  return await syncDisplayName(orgId, phoneId);
}

/**
 * Re-registers the number with WhatsApp servers, which is what actually applies an
 * approved display name change. Has no effect before the change is approved.
 */
/** The profile fields Meta returns for a business phone number. */
export interface BusinessProfile {
  about: string | null;
  address: string | null;
  description: string | null;
  email: string | null;
  profilePictureUrl: string | null;
  websites: string[];
  vertical: string | null;
}

const BUSINESS_PROFILE_FIELDS =
  "about,address,description,email,profile_picture_url,websites,vertical";

export async function getBusinessProfile(orgId: string, phoneId: string): Promise<BusinessProfile> {
  const settings = await getWaSettings(orgId, phoneId);
  if (!settings) throw new Error("WhatsApp settings not found");

  const res = await callMetaApi(
    `/${phoneId}/whatsapp_business_profile`,
    "GET",
    settings.accessToken,
    undefined,
    {},
    {},
    { fields: BUSINESS_PROFILE_FIELDS },
  );

  const profile = res.data?.data?.[0] ?? {};
  return {
    about: profile.about ?? null,
    address: profile.address ?? null,
    description: profile.description ?? null,
    email: profile.email ?? null,
    profilePictureUrl: profile.profile_picture_url ?? null,
    websites: profile.websites ?? [],
    vertical: profile.vertical ?? null,
  };
}

/**
 * Builds the Graph body for a profile update, dropping anything blank.
 *
 * Meta answers a blank field with a bare `(#131000) Something went wrong` rather than
 * clearing it, so an empty string is left out of the request altogether — the stored value
 * simply stays as it is. Exported for the handler, which refuses a request that would carry
 * no fields at all.
 */
export function buildBusinessProfileBody(data: BusinessProfileInput): Record<string, unknown> {
  const { websites, ...rest } = data;
  const body: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(rest)) {
    if (typeof value !== "string" || value.trim() === "") continue;
    body[key] = value.trim();
  }

  const usableWebsites = websites?.map((site) => site.trim()).filter(Boolean) ?? [];
  // The list is JSON-encoded rather than sent as an array — the form Meta documents here.
  if (usableWebsites.length) body.websites = JSON.stringify(usableWebsites);

  return body;
}

/** Writes the profile fields the caller supplied; anything blank or omitted is left as it is. */
export async function updateBusinessProfile(
  orgId: string,
  phoneId: string,
  data: BusinessProfileInput,
) {
  const settings = await getWaSettings(orgId, phoneId);
  if (!settings) throw new Error("WhatsApp settings not found");

  const res = await callMetaApi(
    `/${phoneId}/whatsapp_business_profile`,
    "POST",
    settings.accessToken,
    {
      messaging_product: "whatsapp",
      ...buildBusinessProfileBody(data),
    },
  );
  return res.data;
}

/**
 * Replaces the number's profile photo.
 *
 * Meta takes the image through its resumable upload API — a session against the app, then
 * the bytes — and the opaque handle that comes back is what the profile endpoint accepts.
 */
export async function updateProfilePicture(
  orgId: string,
  phoneId: string,
  file: { buffer: Buffer; mimetype: string; filename: string },
) {
  const settings = await getWaSettings(orgId, phoneId);
  if (!settings) throw new Error("WhatsApp settings not found");
  if (!settings.appId) throw new Error("appId is missing from the WhatsApp settings");

  const sessionRes = await callMetaApi(
    `/${settings.appId}/uploads`,
    "POST",
    settings.accessToken,
    undefined,
    {},
    {},
    {
      file_name: file.filename,
      file_length: file.buffer.length,
      file_type: file.mimetype,
    },
  );

  const uploadSessionId = sessionRes.data?.id;
  if (!uploadSessionId) throw new Error("Meta did not return an upload session");

  // This leg authenticates with `OAuth <token>`, not a bearer header, and carries the bytes raw.
  const uploadRes = await callMetaApi(
    `/${uploadSessionId}`,
    "POST",
    null,
    file.buffer,
    {},
    {
      Authorization: `OAuth ${settings.accessToken}`,
      "Content-Type": "application/octet-stream",
      file_offset: "0",
      "Content-Length": file.buffer.length.toString(),
    },
  );

  const handle = uploadRes.data?.h;
  if (!handle) throw new Error("Meta did not return a file handle for the uploaded image");

  const res = await callMetaApi(
    `/${phoneId}/whatsapp_business_profile`,
    "POST",
    settings.accessToken,
    { messaging_product: "whatsapp", profile_picture_handle: handle },
  );
  return res.data;
}

export async function reRegisterPhoneNumber(orgId: string, phoneId: string) {
  const settings = await getWaSettings(orgId, phoneId);
  if (!settings) throw new Error("WhatsApp settings not found");

  return await registerPhoneNumber(phoneId, settings.accessToken);
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
