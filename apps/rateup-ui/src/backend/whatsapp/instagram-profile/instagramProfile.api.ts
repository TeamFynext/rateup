import { WHATSAPP_URL } from "..";
import { axiosClient } from "../../apiClient";

const base = `${WHATSAPP_URL}/instagram-profile`;

export interface InstagramIceBreaker {
  question: string;
  payload: string;
}

interface InstagramPersistentMenuItem {
  type: "postback" | "web_url";
  title: string;
  payload?: string;
  url?: string;
}

export type InstagramPersistentMenu = {
  locale: string;
  call_to_actions: InstagramPersistentMenuItem[];
}[];

interface InstagramProfileData {
  iceBreakers: InstagramIceBreaker[];
  persistentMenu: InstagramPersistentMenu;
}

export async function getInstagramProfile(channelId: string) {
  return (await axiosClient.get(`${base}/${channelId}`)).data as {
    success: boolean;
    data: InstagramProfileData;
  };
}

export async function setInstagramIceBreakers(
  channelId: string,
  iceBreakers: InstagramIceBreaker[],
  syncWithMeta = false,
) {
  return axiosClient.post(`${base}/${channelId}/ice-breakers`, {
    iceBreakers,
    syncWithMeta,
  });
}

export async function syncInstagramIceBreakers(channelId: string) {
  return axiosClient.post(`${base}/${channelId}/ice-breakers/sync`);
}

export async function deleteInstagramIceBreakers(channelId: string) {
  return axiosClient.delete(`${base}/${channelId}/ice-breakers`);
}

export async function setInstagramPersistentMenu(
  channelId: string,
  persistentMenu: InstagramPersistentMenu,
  syncWithMeta = false,
) {
  return axiosClient.post(`${base}/${channelId}/persistent-menu`, {
    persistentMenu,
    syncWithMeta,
  });
}

export async function syncInstagramPersistentMenu(channelId: string) {
  return axiosClient.post(`${base}/${channelId}/persistent-menu/sync`);
}

export async function deleteInstagramPersistentMenu(channelId: string) {
  return axiosClient.delete(`${base}/${channelId}/persistent-menu`);
}

interface InstagramMediaItem {
  id: string;
  caption?: string;
  media_type: "IMAGE" | "VIDEO" | "CAROUSEL_ALBUM" | "REEL";
  media_url?: string;
  thumbnail_url?: string;
  timestamp: string;
  permalink?: string;
}

interface InstagramStoryItem {
  id: string;
  media_type: "IMAGE" | "VIDEO";
  media_url?: string;
  /** Stories rarely carry one, but the Graph API returns it when set. */
  caption?: string;
  timestamp: string;
}

export async function getInstagramMediaPosts(ibaId: string) {
  return (await axiosClient.get(`${base}/media/${ibaId}`)).data as {
    success: boolean;
    data: InstagramMediaItem[];
  };
}

export async function getInstagramStoriesList(ibaId: string) {
  return (await axiosClient.get(`${base}/stories/${ibaId}`)).data as {
    success: boolean;
    data: InstagramStoryItem[];
  };
}
