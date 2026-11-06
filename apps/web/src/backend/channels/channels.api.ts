import { axiosClient } from "../apiClient";

/** Every platform a channel can be on; webchat and RCS join as their own values. */
export type ChannelPlatform = "WHATSAPP" | "FACEBOOK" | "INSTAGRAM" | "WEBCHAT";

/**
 * One connected channel of any platform — a WhatsApp number, a Messenger Page, an
 * Instagram account — mirroring rateup-api's `Channel` registry row. Credentials and
 * platform features live in each platform's own settings, never here.
 */
export interface Channel {
  id: string;
  orgId: string;
  platform: ChannelPlatform;
  /** The platform's own id: WhatsApp phone number id, Page id, Instagram account id. */
  accountId: string;
  /** What messages record when it is not `accountId`: the WhatsApp display number. */
  address: string | null;
  name: string | null;
  /** Handle, where the platform has one (Instagram). */
  username: string | null;
  status: string;
  /**
   * WhatsApp only: the Meta business portfolio that owns the number. A customer known only
   * by a business-scoped user ID (BSUID) can be messaged from that business's numbers alone.
   * Both are null until the portfolio has been read from Meta.
   */
  whatsapp?: { businessPortfolioId: string | null; businessPortfolioName: string | null } | null;
  createdAt: string;
  updatedAt: string;
}

/** Every channel the viewer's teams reach, of every platform. */
export const getChannels = async (): Promise<Channel[]> => {
  const res = await axiosClient.get<Channel[]>("/channels");
  return res.data;
};

/**
 * What the inbox's channel filter stores for the website chat widget. Webchat has no
 * connected-channel row, so it is a fixed value rather than an account id.
 */
export const WEBCHAT_FILTER = "webchat";

/** Whether the inbox should offer Webchat as a channel: the org has had webchat visitors. */
export const getWebchatStatus = async (): Promise<{ active: boolean }> => {
  const res = await axiosClient.get<{ active: boolean }>("/channels/webchat");
  return res.data;
};
