import type { Integration, Prisma } from "../../../../generated/prisma/client.js";
import prisma from "../../../utils/prisma.js";
import { IntegratedApps } from "../../../types/enums.js";
import type { OAuth2Tokens } from "../shared/oauth2.js";
import { OAuthConnectError } from "../shared/oauthConnectError.js";
import { getGoogleAccountEmail, readGoogleSheetCredential } from "./googlesheet.auth.js";

/**
 * Connecting a Google account for Sheets, through the shared consent-screen
 * flow (`shared/oauthConnect.ts`): it exchanges the code, then hands the tokens
 * to {@link connectGoogleSheet} to keep.
 */

const PROVIDER = IntegratedApps.googlesheet;

const whereOrg = (orgId: string) => ({
  orgid_integration_name_unique: { orgId, name: PROVIDER },
});

export async function connectGoogleSheet(orgId: string, tokens: OAuth2Tokens): Promise<void> {
  const existing = await prisma.integration.findUnique({ where: whereOrg(orgId) });
  const previous = readGoogleSheetCredential(existing?.credential);

  // Asked for with `prompt=consent`, so Google sends one; keep the old one if it ever does not.
  const refreshToken = tokens.refreshToken ?? previous?.refreshToken;
  if (!refreshToken) {
    throw new OAuthConnectError(
      "Google did not grant offline access. Remove RateUp from your Google account's connected apps and try again.",
      400,
    );
  }

  const userEmail = await getGoogleAccountEmail(tokens.accessToken);
  const credential: GoogleSheetCredential = {
    accessToken: tokens.accessToken,
    refreshToken,
    ...(tokens.expiresAt && { expiryDate: Date.parse(tokens.expiresAt) }),
    scopes: tokens.scope ? tokens.scope.split(" ") : [],
    userEmail,
    // The "RateUp" Drive folder is found or made on the first sync. A different
    // account cannot see the old one.
    driveFolderId:
      previous && previous.userEmail === userEmail ? (previous.driveFolderId ?? null) : null,
  };
  const data = credential as unknown as Prisma.InputJsonValue;

  await prisma.integration.upsert({
    where: whereOrg(orgId),
    create: { orgId, name: PROVIDER, credential: data },
    update: { credential: data, active: true },
  });
}

/**
 * Forgets every survey's spreadsheet: the files stay in the account's Drive,
 * but a later connection — maybe to another account — cannot write to them.
 */
export async function disconnectGoogleSheet(integration: Integration): Promise<void> {
  if (!integration.orgId) return;
  await prisma.survey.updateMany({
    where: { orgId: integration.orgId },
    data: { spreadSheetId: null },
  });
}
