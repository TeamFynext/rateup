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

  if (data.phoneId && !data.phone) {
    const { display_phone_number } = await getPhoneDetails(data.phoneId, accessToken);
    data.phone = display_phone_number?.replace(/\s+/g, "");
  }

  // Encrypted on BOTH branches. This used to encrypt only when a phoneId was
  // present, so every Instagram- and Facebook-only channel wrote its token
  // verbatim into a column the schema comments as "// encrypted".
  // See issues.txt 13.5.
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
      // pageAccessToken was never encrypted on either branch. See issues.txt 13.5.
      pageAccessToken: data.pageAccessToken ? encryptInlineToken(data.pageAccessToken) : undefined,
    },
  });
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

/**
 * A channel by id, scoped to the org asking.
 *
 * orgId is REQUIRED. Every endpoint reaching here takes whatsappSettingsId off a
 * request path or query, and none of them compared the row's orgId to the
 * caller's — so any authenticated user could read, rewrite or sync another org's
 * channel, and getMetaAssetsHandler handed out that org's working Facebook page
 * access tokens. See issues.txt 13.1.
 */
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

  // No `res.wabaId ?` guard any more — the decrypt is total. See issues.txt 13.4.
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

/**
 * Reads a settings row with its tokens in plain form.
 *
 * TOTAL, deliberately. This used to throw a TypeError whenever `accessToken_iv`
 * was null, and createWaSettings only ever set that column on the phoneId branch
 * — so a Facebook- or Instagram-only channel could not be read at all. Two
 * callers worked around it with a `res.wabaId ? ... : res` guard and six did not,
 * which meant one page-only channel took down the entire Facebook webhook
 * (getWaSettingsByPageId is its first call) and emptied every channel picker in
 * the dashboard. See issues.txt 13.4.
 *
 * A row with no IV is returned with its token as stored, which is exactly what
 * those rows hold: plain text (13.5).
 */
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
  // Encrypted here too. This path wrote whatever it was handed, verbatim, while
  // its sibling updateWaSettings encrypted — so a token written through
  // PUT /:whatsappSettingsId was stored in plain text. See issues.txt 13.5.
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
      // Scoped: the id came straight off the request path and nothing compared
      // the row's org to the caller's. See issues.txt 13.1.
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
      if (!data.pageAccessToken) {
        throw new Error("pageAccessToken is required to connect a Facebook page");
      }
      await subscribePageToApp(data.fbPageId, data.pageAccessToken, [
        "messages",
        "message_reads",
        "message_reactions",
      ]);
      const { accessToken } = getWaSettingsWithAccessTokenDecrypted(existingSettings);
      // Tokens passed as callMetaApi's accessToken argument, which sends them as
      // an Authorization header. Interpolated into the URL they landed in the
      // trace log of config.url and in the full axios-config dump wa_axios.ts
      // writes on any non-2xx. See issues.txt 13.3.
      if (data.ibaId) {
        const igData = await callMetaApi(`/${data.ibaId}?fields=username`, "GET", accessToken);
        data.igUserName = igData.data.username;
      }
      const fbData = await callMetaApi(`/${data.fbPageId}?fields=name`, "GET", accessToken);
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

/**
 * Paged WhatsApp logs.
 *
 * `page` is ZERO-BASED — page 0 is the first page. That was already true (skip is
 * `page * limit`) but was stated nowhere and the schema left the field optional
 * with no default; it now defaults to 0 there. See issues.txt 13.6.
 */
export async function getWaLogs(orgId: string, query: PaginationQuery) {
  const { page, limit, desc = "desc", phone } = query;
  // One where clause for both queries. The count used to filter on orgId alone
  // while the rows were also filtered by phone, so a search matching three logs
  // out of ten thousand reported totalCount 10000 and the client's pager offered
  // pages that came back empty. Same off-by-one family as issues.txt 8.2.
  const where = {
    orgId,
    phone: phone ? { contains: phone } : undefined,
  };
  const totalCount = await prisma.waLogs.count({ where });
  const logs = await prisma.waLogs.findMany({
    where,
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

export async function getFbPagesFromWa(
  settingsId: string,
  orgId: string,
): Promise<MetaGraphPage[]> {
  const settings = await getWaSettingsById(settingsId, orgId);
  if (!settings?.accessToken) {
    throw new Error("accesstoken not found");
  }
  const { accessToken } = settings;
  const url = `/me/accounts?fields=id,name,access_token,instagram_business_account`;
  const res = await callMetaApi(url, "GET", accessToken);
  // This response carries `access_token` for EVERY page. It used to be logged in
  // full at info — a level that is on in production — so a working page token for
  // every connected Facebook page was written to the log on every page sync, and
  // those tokens do not expire on their own. Only the ids and names are logged
  // now, and at trace. See issues.txt 13.3.
  log.trace(
    { pages: (res?.data?.data as MetaGraphPage[] | undefined)?.map((page) => page.id) },
    "Pages fetched from meta",
  );
  return res.data?.data;
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
  // NOTE: one Meta call per ad account. Fine for a handful; see issues.txt 13.11.
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
    // The four console.log calls that were here are gone — one of them printed the
    // whole axios response object, whose config.url carried the access token.
    // See issues.txt 13.3.
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

/**
 * The synced Meta assets for a channel, scoped to the org asking.
 *
 * This is the one that leaked credentials: the stored blob holds
 * pages[].access_token (see MetaAsset above), and getMetaAssetsHandler returns it
 * verbatim — so an unscoped read handed any authenticated user working Facebook
 * page access tokens for another org. See issues.txt 13.1.
 *
 * Returns null for a channel the org does not own, and for one that has never
 * been synced — callers must handle both (issues.txt 13.10).
 */
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
