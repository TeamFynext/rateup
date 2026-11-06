import axios, { isAxiosError, type AxiosInstance } from "axios";

import type { HubSpotTokenInfo } from "./hubspot.types.js";

export const HUBSPOT_API = "https://api.hubapi.com";

/** An axios client for one HubSpot account, with a current access token. */
export function createHubSpotClient(accessToken: string): AxiosInstance {
  return axios.create({
    baseURL: HUBSPOT_API,
    timeout: 15_000,
    headers: { Accept: "application/json", Authorization: `Bearer ${accessToken}` },
  });
}

export function isHubSpotUnauthorized(error: unknown) {
  return isAxiosError(error) && error.response?.status === 401;
}

/** Which account, user and scopes a freshly issued token belongs to. */
export async function getHubSpotTokenInfo(accessToken: string): Promise<HubSpotTokenInfo> {
  const response = await axios.get<HubSpotTokenInfo>(
    `${HUBSPOT_API}/oauth/v1/access-tokens/${encodeURIComponent(accessToken)}`,
    { timeout: 15_000 },
  );
  return response.data;
}

/** Revokes the grant, so the app disappears from the account's connected apps. */
export async function revokeHubSpotRefreshToken(refreshToken: string) {
  await axios.delete(`${HUBSPOT_API}/oauth/v1/refresh-tokens/${encodeURIComponent(refreshToken)}`, {
    timeout: 15_000,
  });
}
