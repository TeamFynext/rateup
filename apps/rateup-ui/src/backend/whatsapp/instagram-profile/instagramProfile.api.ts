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

export async function getInstagramProfile(waSettingsId: string) {
  return (await axiosClient.get(`${base}/${waSettingsId}`)).data as {
    success: boolean;
    data: InstagramProfileData;
  };
}

export async function setInstagramIceBreakers(
  waSettingsId: string,
  iceBreakers: InstagramIceBreaker[],
  syncWithMeta = false,
) {
  return axiosClient.post(`${base}/${waSettingsId}/ice-breakers`, {
    iceBreakers,
    syncWithMeta,
  });
}

export async function syncInstagramIceBreakers(waSettingsId: string) {
  return axiosClient.post(`${base}/${waSettingsId}/ice-breakers/sync`);
}

export async function deleteInstagramIceBreakers(waSettingsId: string) {
  return axiosClient.delete(`${base}/${waSettingsId}/ice-breakers`);
}

export async function setInstagramPersistentMenu(
  waSettingsId: string,
  persistentMenu: InstagramPersistentMenu,
  syncWithMeta = false,
) {
  return axiosClient.post(`${base}/${waSettingsId}/persistent-menu`, {
    persistentMenu,
    syncWithMeta,
  });
}

export async function syncInstagramPersistentMenu(waSettingsId: string) {
  return axiosClient.post(`${base}/${waSettingsId}/persistent-menu/sync`);
}

export async function deleteInstagramPersistentMenu(waSettingsId: string) {
  return axiosClient.delete(`${base}/${waSettingsId}/persistent-menu`);
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
