import axios from "@/config/axios";

/**
 * One connected channel of any platform (a WhatsApp number, a Messenger Page, an
 * Instagram account), mirroring rateup-api's `Channel` registry and rateup-ui's type.
 */
export interface Channel {
  id: string;
  platform: "WHATSAPP" | "FACEBOOK" | "INSTAGRAM" | "WEBCHAT";
  /** The platform's own id: WhatsApp phone number id, Page id, Instagram account id. */
  accountId: string;
  /** What messages record when it is not `accountId`: the WhatsApp display number. */
  address: string | null;
  /** The Page or account name. */
  name: string | null;
  /** Handle, where the platform has one (Instagram). */
  username: string | null;
  status: string;
}

/** Every channel the viewer's teams reach, of every platform. */
export async function getChannels(): Promise<Channel[]> {
  return (await axios.get<Channel[]>("/api/channels")).data;
}

/**
 * What the inbox's channel filter stores for the website chat widget. Webchat has no
 * connected-channel row, so it is a fixed value rather than an account id.
 */
export const WEBCHAT_FILTER = "webchat";

/** Whether the inbox should offer Webchat as a channel: the org has had webchat visitors. */
export async function getWebchatStatus(): Promise<{ active: boolean }> {
  return (await axios.get<{ active: boolean }>("/api/channels/webchat")).data;
}
