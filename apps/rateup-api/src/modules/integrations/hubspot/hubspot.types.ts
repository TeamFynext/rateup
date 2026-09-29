/**
 * `Integration.credential` for HubSpot. `access_token` and `refresh_token` are
 * encrypted at rest by the credential extension (their names are in its list).
 *
 * Not to be confused with `utils/hubspot.ts`, which is RateUp's own HubSpot
 * account for its sign-ups, reached with a private-app token.
 */
export interface HubSpotCredential {
  access_token: string;
  /** HubSpot keeps the same refresh token across refreshes; it only changes on reconnect. */
  refresh_token: string;
  /** ISO timestamp. Access tokens live 30 minutes. */
  expires_at: string;
  /** The HubSpot account ("portal", "hub") — what app webhooks are routed by. */
  portalId: number;
  /** e.g. `acme.hubspot.com`, for the settings page. */
  hubDomain?: string;
  /** The HubSpot user who approved the connection. */
  connectedBy?: string;
  scopes?: string[];
  connectedAt: string;
}

export function readHubSpotCredential(credential: unknown): HubSpotCredential | null {
  const value = credential as Partial<HubSpotCredential> | null;
  if (!value?.access_token || !value.refresh_token || !value.portalId) return null;
  return value as HubSpotCredential;
}

/** What HubSpot says about an access token (`GET /oauth/v1/access-tokens/:token`). */
export interface HubSpotTokenInfo {
  hub_id: number;
  hub_domain?: string;
  user?: string;
  scopes?: string[];
  app_id?: number;
}
