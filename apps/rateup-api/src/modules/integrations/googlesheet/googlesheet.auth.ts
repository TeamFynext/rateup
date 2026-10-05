import { google } from "googleapis";

import type { OAuth2Config } from "../shared/oauth2.js";

/**
 * Google's OAuth client for Sheets. The same `GOOGLE_OAUTH_CLIENT_*` app the
 * integration always used; read from the environment directly because
 * `config.ts` drags auth and services into everything the registry imports.
 */
export const googleSheetOAuthConfig: OAuth2Config = {
  authorizeUrl: "https://accounts.google.com/o/oauth2/v2/auth",
  tokenUrl: "https://oauth2.googleapis.com/token",
  get clientId() {
    return process.env.GOOGLE_OAUTH_CLIENT_ID;
  },
  get clientSecret() {
    return process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  },
  tokenAuth: "form",
};

/** Only files RateUp creates itself, and the account's address to show on the settings page. */
export const GOOGLE_SHEET_SCOPES = [
  "https://www.googleapis.com/auth/drive.file",
  "https://www.googleapis.com/auth/userinfo.email",
] as const;

/**
 * `offline` for a refresh token; `consent` because Google only issues one on
 * the first grant, and a reconnect must get a new one too.
 */
export const GOOGLE_SHEET_AUTHORIZE_PARAMS = { access_type: "offline", prompt: "consent" };

/**
 * The redirect URI registered in Google Cloud Console before the shared flow
 * existed. Its page posts the code to the shared callback route.
 */
export const GOOGLE_SHEET_REDIRECT_PATH = "/auth/oauth2callback";

export type GoogleAuthClient = InstanceType<typeof google.auth.OAuth2>;

function newGoogleClient(): GoogleAuthClient {
  return new google.auth.OAuth2(
    googleSheetOAuthConfig.clientId,
    googleSheetOAuthConfig.clientSecret,
  );
}

/** Reads the stored credential, or null when the row is not a Sheets connection. */
export function readGoogleSheetCredential(credential: unknown): GoogleSheetCredential | null {
  if (!credential || typeof credential !== "object") return null;
  const value = credential as Partial<GoogleSheetCredential>;
  return typeof value.refreshToken === "string" ? (value as GoogleSheetCredential) : null;
}

/**
 * A Google client acting as the connected account. It holds only the refresh
 * token and mints access tokens itself as it needs them.
 */
export function googleClientFor(credential: unknown): GoogleAuthClient {
  const stored = readGoogleSheetCredential(credential);
  if (!stored) throw new Error("Google Sheets is not connected");
  const client = newGoogleClient();
  client.setCredentials({ refresh_token: stored.refreshToken });
  return client;
}

/** The address of the Google account an access token belongs to. */
export async function getGoogleAccountEmail(accessToken: string): Promise<string | null> {
  const { email } = await newGoogleClient().getTokenInfo(accessToken);
  return email ?? null;
}
