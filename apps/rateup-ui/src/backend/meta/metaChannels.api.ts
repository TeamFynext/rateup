import { axiosClient } from "../apiClient";
import type { Channel } from "../channels/channels.api";

const META_CHANNELS_URL = "/meta/channels";

/** Messenger is FACEBOOK; each platform has its own login config and its own rows. */
export type MetaChannelPlatform = "FACEBOOK" | "INSTAGRAM";

/**
 * A Messenger Page or an Instagram account: its registry row (`Channel`) plus the Page it
 * sends through, as `/api/meta/channels` lists it. Any number of each per org, connected
 * through its own Facebook login, independent of WhatsApp and of each other.
 */
export interface MetaChannel extends Channel {
  platform: MetaChannelPlatform;
  /** The Page itself, or the Page an Instagram account is linked to. */
  fbPageId: string;
  pageName: string | null;
}

/** A Page or Instagram account the Facebook login was granted, offered for connecting. */
export interface GrantedMetaAccount {
  accountId: string;
  fbPageId: string;
  name?: string;
  username?: string;
  pageName?: string;
  pictureUrl?: string;
  /** This org's channel for the account, when it is already connected. */
  connectedChannelId: string | null;
  /** Connected to another organization, so it cannot be connected here. */
  connectedElsewhere: boolean;
}

export interface MetaChannelLogin {
  platform: MetaChannelPlatform;
  /** Short-lived handle on the login's token, which stays on the server. */
  loginId: string;
  accounts: GrantedMetaAccount[];
}

export interface ConnectMetaChannelsResult {
  results: { accountId: string; channel?: MetaChannel; error?: string }[];
}

export const getMetaChannels = async (): Promise<MetaChannel[]> => {
  const res = await axiosClient.get<MetaChannel[]>(META_CHANNELS_URL);
  return res.data;
};

export const loginMetaChannels = async (body: {
  platform: MetaChannelPlatform;
  code: string;
}): Promise<MetaChannelLogin> => {
  const res = await axiosClient.post<MetaChannelLogin>(`${META_CHANNELS_URL}/login`, body, {
    timeout: 1000 * 25,
  });
  return res.data;
};

export const connectMetaChannels = async (body: {
  platform: MetaChannelPlatform;
  loginId: string;
  accountIds: string[];
}): Promise<ConnectMetaChannelsResult> => {
  // A 400 still carries the per-account results, so it is read rather than thrown.
  const res = await axiosClient.post<ConnectMetaChannelsResult>(
    `${META_CHANNELS_URL}/connect`,
    body,
    { timeout: 1000 * 60, validateStatus: (status) => status === 200 || status === 400 },
  );
  return res.data;
};

export const deleteMetaChannel = async (channelId: string) => {
  const res = await axiosClient.delete<{ deleted: true }>(`${META_CHANNELS_URL}/${channelId}`);
  return res.data;
};
