import type { OAuth2Config } from "../../shared/oauth2.js";

/**
 * Zoho's accounts server for the India data centre, where every Rateup org's
 * Zoho account lives today. Credentials are read on access so tests and late
 * env loading see the current values.
 */
export const ZOHO_OAUTH: OAuth2Config = {
  authorizeUrl: "https://accounts.zoho.in/oauth/v2/auth",
  tokenUrl: "https://accounts.zoho.in/oauth/v2/token",
  get clientId() {
    return process.env.ZOHO_CLIENT_ID;
  },
  get clientSecret() {
    return process.env.ZOHO_CLIENT_SECRET;
  },
  tokenAuth: "query",
};

/** The fields of a Zoho token response Rateup reads. */
export interface ZohoTokenResponse {
  access_token: string;
  /** Only on the code exchange; a refresh response omits it. */
  refresh_token: string;
  expires_in: number;
  api_domain: string;
  scope: string;
}
