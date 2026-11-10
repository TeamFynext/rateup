import { axiosClient } from "../../apiClient";

const base = "/messenger/profile";

export interface MessengerIceBreaker {
  question: string;
  payload: string;
}

export type MessengerMenuItem =
  | { type: "postback"; title: string; payload: string }
  | { type: "web_url"; title: string; url: string };

/** What Meta holds for the Page, read back on every load; mirrors the API's MessengerProfile. */
export interface MessengerProfile {
  getStarted: string | null;
  greeting: string | null;
  iceBreakers: MessengerIceBreaker[];
  persistentMenu: MessengerMenuItem[];
}

export type MessengerProfileSection =
  | "get-started"
  | "greeting"
  | "ice-breakers"
  | "persistent-menu";

interface ProfileResponse {
  success: boolean;
  data: MessengerProfile;
}

export async function getMessengerProfile(channelId: string) {
  return (await axiosClient.get<ProfileResponse>(`${base}/${channelId}`)).data.data;
}

/** Each section saves on its own; the answer is the whole profile as Meta now has it. */
export async function setMessengerProfileSection(
  channelId: string,
  section: MessengerProfileSection,
  body: Record<string, unknown>,
) {
  return (await axiosClient.put<ProfileResponse>(`${base}/${channelId}/${section}`, body)).data
    .data;
}

export async function deleteMessengerProfileSection(
  channelId: string,
  section: MessengerProfileSection,
) {
  return (await axiosClient.delete<ProfileResponse>(`${base}/${channelId}/${section}`)).data.data;
}
