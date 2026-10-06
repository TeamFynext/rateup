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
  createdAt: string;
  updatedAt: string;
}

/** Every channel the viewer's teams reach, of every platform. */
export const getChannels = async (): Promise<Channel[]> => {
  const res = await axiosClient.get<Channel[]>("/channels");
  return res.data;
};
