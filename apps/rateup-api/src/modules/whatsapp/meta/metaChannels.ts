import { PlatformType } from "../../../../generated/prisma/enums.js";
import { WaTemplateCategory } from "../../../types/enums.js";
import {
  getWaSettings,
  getWaSettingsByIbaId,
  getWaSettingsByPageId,
} from "../settings/wa_settings.service.js";

/**
 * What every Meta surface differs on, and nothing else.
 *
 * WhatsApp, Instagram and Facebook Messenger all send through Graph but disagree
 * on three details: which settings row holds the credentials, what the path
 * looks like, and where the message id lands in the response. Those three
 * differences are the whole of this table — so adding Threads later is a new
 * entry rather than another branch inside the send path.
 */

/** Where a send is addressed from, before the channel resolves credentials. */
export interface MetaChannelContext {
  orgId: string;
  /** WhatsApp: the business phone id. Instagram: the IBA id. Facebook: the page id. */
  sourceIdentifier?: string;
  /** WhatsApp only: MARKETING sends go to a different endpoint. */
  category?: WaTemplateCategory;
}

export interface MetaCredentials {
  accessToken: string;
  /** Echoed onto the stored message so replies thread to the right account. */
  sourceIdentifier: string;
  /** WhatsApp only. */
  phoneId?: string;
  /**
   * Where the token goes. Instagram rejects the Authorization header on
   * `/me/messages` and wants `?access_token=`; WhatsApp wants the header.
   */
  auth: "header" | "query";
}

export interface MetaChannel {
  platform: PlatformType;
  /** Null when the org has not connected this surface — the caller reports it, never throws. */
  resolveCredentials(ctx: MetaChannelContext): Promise<MetaCredentials | null>;
  buildPath(creds: MetaCredentials, ctx: MetaChannelContext): string;
  extractMessageId(responseData: unknown): string | undefined;
  /**
   * Who Meta says it delivered to. Instagram private replies are addressed to a
   * comment, not a person, so the contact only becomes known from the response.
   */
  extractRecipientId?(responseData: unknown): string | undefined;
}

const whatsapp: MetaChannel = {
  platform: PlatformType.WHATSAPP,
  async resolveCredentials({ orgId, sourceIdentifier }) {
    const settings = await getWaSettings(orgId, sourceIdentifier);
    if (!settings?.accessToken || !settings.phoneId) return null;
    return {
      accessToken: settings.accessToken,
      auth: "header",
      phoneId: settings.phoneId,
      // The business number the message goes out on, without the leading `+`,
      // which is the form every stored message uses.
      sourceIdentifier: settings.phone?.replace("+", "") ?? settings.phoneId,
    };
  },
  buildPath(creds, { category }) {
    // Marketing traffic is metered separately by Meta and has its own endpoint.
    const endpoint = category === WaTemplateCategory.MARKETING ? "marketing_messages" : "messages";
    return `/${creds.phoneId}/${endpoint}`;
  },
  extractMessageId(data) {
    return (data as { messages?: { id?: string }[] } | undefined)?.messages?.[0]?.id;
  },
};

/** Instagram and Messenger share the Send API; only the settings lookup differs. */
function sendApiChannel(
  platform: PlatformType,
  lookup: (identifier: string) => Promise<{ pageAccessToken: string | null } | null>,
  auth: MetaCredentials["auth"],
): MetaChannel {
  return {
    platform,
    async resolveCredentials({ sourceIdentifier }) {
      if (!sourceIdentifier) return null;
      const settings = await lookup(sourceIdentifier);
      if (!settings?.pageAccessToken) return null;
      return { accessToken: settings.pageAccessToken, sourceIdentifier, auth };
    },
    buildPath() {
      return "/me/messages";
    },
    extractMessageId(data) {
      return (data as { message_id?: string } | undefined)?.message_id;
    },
    extractRecipientId(data) {
      return (data as { recipient_id?: string } | undefined)?.recipient_id;
    },
  };
}

const CHANNELS: Partial<Record<PlatformType, MetaChannel>> = {
  [PlatformType.WHATSAPP]: whatsapp,
  // Header auth, as the Instagram senders have always used. `auth` stays on the
  // credentials because the older inbox path passes the token as a query
  // parameter instead, and both have to keep working while it is routed here.
  [PlatformType.INSTAGRAM]: sendApiChannel(PlatformType.INSTAGRAM, getWaSettingsByIbaId, "header"),
  [PlatformType.FACEBOOK]: sendApiChannel(PlatformType.FACEBOOK, getWaSettingsByPageId, "header"),
};

export function getMetaChannel(platform: PlatformType): MetaChannel | undefined {
  return CHANNELS[platform];
}
