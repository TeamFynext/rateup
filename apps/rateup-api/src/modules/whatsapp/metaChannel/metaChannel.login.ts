import crypto from "node:crypto";
import redis from "../../../utils/redisConnection.js";
import { log } from "../../../utils/logger.js";
import { callMetaApi } from "../wa_axios.js";
import { decryptInlineToken, encryptInlineToken } from "../settings/wa_settings.service.js";
import { PlatformType } from "../../../../generated/prisma/enums.js";
import { getInstagramAccountProfile, type MetaChannelPlatform } from "./metaChannel.service.js";

/**
 * The Facebook Login for Business step of connecting Messenger Pages or Instagram accounts.
 *
 * Messenger and Instagram each have their own login config, asking only for that platform's
 * permissions. The login returns a code; the server trades it for a token, lists what that
 * token was granted for the platform, and parks the token in Redis under a one-off
 * `loginId`. The dashboard then picks accounts by id. Page tokens never reach the browser,
 * so the browser cannot connect anything this login was not granted.
 */

const LOGIN_TTL_SECONDS = 30 * 60;
/** A token that would expire sooner than this is swapped for a long-lived one. */
const LONG_LIVED_THRESHOLD_SECONDS = 7 * 24 * 60 * 60;

/** Scoped to the platform too: a Messenger login cannot connect Instagram, nor the reverse. */
function loginKey(orgId: string, platform: MetaChannelPlatform, loginId: string) {
  return `meta:channel-login:${orgId}:${platform}:${loginId}`;
}

/**
 * Trades the login code for a token. A config issuing a business integration system user
 * token returns one that does not expire; a user-token config returns a short-lived one,
 * which is exchanged so the Page tokens derived from it do not expire either.
 */
export async function exchangeLoginCode(code: string): Promise<string> {
  const res = await callMetaApi(
    `/oauth/access_token?client_id=${process.env.waclient_id}&client_secret=${process.env.waclient_secret}&code=${encodeURIComponent(code)}&redirect_uri=`,
    "GET",
  );
  const token: string | undefined = res.data?.access_token;
  if (!token) throw new Error("Meta did not return an access token for this login");

  const expiresIn: number | undefined = res.data?.expires_in;
  if (!expiresIn || expiresIn > LONG_LIVED_THRESHOLD_SECONDS) return token;

  try {
    const longLived = await callMetaApi(
      `/oauth/access_token?grant_type=fb_exchange_token&client_id=${process.env.waclient_id}&client_secret=${process.env.waclient_secret}&fb_exchange_token=${encodeURIComponent(token)}`,
      "GET",
    );
    return longLived.data?.access_token ?? token;
  } catch (err) {
    log.warn({ err }, "Could not exchange the Page login token for a long-lived one");
    return token;
  }
}

interface GrantedPage {
  id: string;
  name?: string;
  pictureUrl?: string;
  access_token: string;
  instagramAccountId?: string;
}

interface MetaGraphAccount {
  id: string;
  name?: string;
  access_token: string;
  picture?: { data?: { url?: string } };
  instagram_business_account?: { id: string };
}

/** Every Page the token was granted, with the id of its linked Instagram account if any. */
async function listGrantedPages(accessToken: string): Promise<GrantedPage[]> {
  const res = await callMetaApi(
    `/me/accounts?fields=id,name,access_token,picture.type(large){url},instagram_business_account&limit=100`,
    "GET",
    accessToken,
  );
  const accounts = (res.data?.data ?? []) as MetaGraphAccount[];
  return accounts.map((account) => ({
    id: account.id,
    name: account.name,
    pictureUrl: account.picture?.data?.url,
    access_token: account.access_token,
    instagramAccountId: account.instagram_business_account?.id,
  }));
}

/** One connectable Messenger Page or Instagram account, with what connecting it needs. */
export interface GrantedAccount {
  /** Page id for Messenger, Instagram account id for Instagram. */
  accountId: string;
  fbPageId: string;
  pageAccessToken: string;
  name?: string;
  username?: string;
  pageName?: string;
  pictureUrl?: string;
}

/**
 * What the login was granted for one platform: every Page for Messenger, every Instagram
 * account linked to a granted Page for Instagram. A Page with no linked account offers
 * nothing for Instagram.
 */
export async function listGrantedAccounts(
  platform: MetaChannelPlatform,
  accessToken: string,
): Promise<GrantedAccount[]> {
  const pages = await listGrantedPages(accessToken);

  if (platform === PlatformType.FACEBOOK) {
    return pages.map((page) => ({
      accountId: page.id,
      fbPageId: page.id,
      pageAccessToken: page.access_token,
      name: page.name,
      pageName: page.name,
      pictureUrl: page.pictureUrl,
    }));
  }

  const linked = pages.filter((page): page is GrantedPage & { instagramAccountId: string } =>
    Boolean(page.instagramAccountId),
  );
  return Promise.all(
    linked.map(async (page) => {
      const profile = await getInstagramAccountProfile(page.instagramAccountId, page.access_token);
      return {
        accountId: page.instagramAccountId,
        fbPageId: page.id,
        pageAccessToken: page.access_token,
        name: profile.name,
        username: profile.username,
        pageName: page.name,
        pictureUrl: profile.profile_picture_url,
      };
    }),
  );
}

export async function storeLogin(
  orgId: string,
  platform: MetaChannelPlatform,
  accessToken: string,
): Promise<string> {
  const loginId = crypto.randomUUID();
  await redis.set(
    loginKey(orgId, platform, loginId),
    encryptInlineToken(accessToken),
    "EX",
    LOGIN_TTL_SECONDS,
  );
  return loginId;
}

/** Null once the login has expired, or when it belongs to another org or platform. */
export async function readLogin(
  orgId: string,
  platform: MetaChannelPlatform,
  loginId: string,
): Promise<string | null> {
  const stored = await redis.get(loginKey(orgId, platform, loginId));
  return stored ? decryptInlineToken(stored) : null;
}
