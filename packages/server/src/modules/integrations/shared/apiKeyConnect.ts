import type { IntegrationProvider } from "../providers/integrationProvider.types.js";
import { IntegrationConnectError } from "./oauthConnectError.js";

/**
 * The connect flow every pasted-key provider shares, behind
 * `POST /api/integrations/:name/connect`: the provider checks the fields
 * against its own API and saves the connection, so a typo is refused on the
 * spot rather than surfacing later as leads that quietly fail to sync.
 *
 * The counterpart of `oauthConnect.ts` for providers with no consent screen.
 */
export function connectWithApiKey(
  provider: IntegrationProvider | undefined,
  name: string,
  orgId: string,
  fields: Readonly<Record<string, string>>,
): Promise<unknown> {
  if (!provider?.apiKey) {
    throw new IntegrationConnectError(`${name} does not connect with an API key`, 404);
  }
  return provider.apiKey.connect(orgId, fields);
}
