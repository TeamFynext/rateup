import { appConfig } from "../../../config.js";
import type { IntegrationProvider, ProviderOAuth } from "../providers/integrationProvider.types.js";
import {
  buildAuthorizeUrl,
  exchangeOAuthCode,
  signOAuthState,
  verifyOAuthState,
} from "./oauth2.js";
import { getIntegrationKey } from "./integrationSecret.js";
import { OAuthConnectError } from "./oauthConnectError.js";

/**
 * The connect flow every OAuth provider shares, behind two routes:
 * `GET /api/integrations/:name/oauth/authorize-url` starts it and
 * `POST /api/integrations/:name/oauth/callback` finishes it.
 *
 * The provider comes back to the frontend's generic callback page
 * (`/dashboard/settings/integrations/:name/callback`), which posts the code and
 * state here with the user's session. So the org is known twice — from the
 * session and from the signed state — and the two must agree: a code started by
 * one org cannot be finished into another.
 */

export { OAuthConnectError };

/** Must match the redirect URI registered in each provider's developer console. */
export function oauthRedirectUri(provider: string, oauth?: Pick<ProviderOAuth, "redirectPath">) {
  if (oauth?.redirectPath) return `${appConfig.frontendUrl}${oauth.redirectPath}`;
  return `${appConfig.frontendUrl}/dashboard/settings/integrations/${provider}/callback`;
}

function oauthOf(provider: IntegrationProvider | undefined, name: string) {
  if (!provider?.oauth) {
    throw new OAuthConnectError(`${name} does not connect through OAuth`, 404);
  }
  return provider.oauth;
}

export function startOAuthConnect(
  provider: IntegrationProvider | undefined,
  name: string,
  orgId: string,
  userId?: string,
  /** The authorize-url's query, for a provider whose scopes depend on it (`scopesFor`). */
  options: Readonly<Record<string, string>> = {},
): string {
  const oauth = oauthOf(provider, name);
  if (!oauth.config.clientId) {
    // Unconfigured in this environment: say so, rather than send the user to a
    // consent screen that will only reject an empty client id.
    throw new OAuthConnectError(`${name} is not configured on this server`, 404);
  }
  if (!getIntegrationKey("oauth-state")) {
    // The state is signed with it. Without this check the signing throws a bare
    // error and the page shows "Something went wrong" with nothing to act on.
    throw new OAuthConnectError(
      `${name} cannot connect: INTEGRATION_SECRET_KEY is not set on this server`,
      404,
    );
  }
  return buildAuthorizeUrl(oauth.config, {
    redirectUri: oauthRedirectUri(name, oauth),
    state: signOAuthState({ orgId, provider: name, userId }),
    scopes: [...(oauth.scopesFor?.(options) ?? oauth.scopes)],
    scopeSeparator: oauth.scopeSeparator,
    extraParams: oauth.extraAuthorizeParams,
  });
}

export async function finishOAuthConnect(
  provider: IntegrationProvider | undefined,
  name: string,
  orgId: string,
  { code, state }: { code: string; state: string },
): Promise<void> {
  const oauth = oauthOf(provider, name);

  let payload;
  try {
    payload = verifyOAuthState(state, name);
  } catch (error) {
    throw new OAuthConnectError(
      error instanceof Error ? error.message : "Invalid OAuth state",
      400,
    );
  }
  if (payload.orgId !== orgId) {
    throw new OAuthConnectError("OAuth state belongs to another organisation", 400);
  }

  const tokens = await exchangeOAuthCode(oauth.config, {
    code,
    redirectUri: oauthRedirectUri(name, oauth),
  });
  await oauth.connect(orgId, tokens);
}
