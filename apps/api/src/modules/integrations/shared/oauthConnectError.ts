/**
 * A connect that failed in a way the user should be told about — a rejected
 * API key, an account already connected elsewhere. Answered with its status
 * and message by the shared connect routes.
 *
 * Its own module so a provider's `connect` can throw it: `oauthConnect.ts`
 * imports `config.ts`, which the provider registry must not pull in.
 */
export class IntegrationConnectError extends Error {
  constructor(
    message: string,
    readonly statusCode: 400 | 404 | 409 | 429 | 502,
  ) {
    super(message);
    this.name = "IntegrationConnectError";
  }
}

/** The same, from the consent-screen flow. */
export class OAuthConnectError extends IntegrationConnectError {
  constructor(message: string, statusCode: 400 | 404 | 409) {
    super(message, statusCode);
    this.name = "OAuthConnectError";
  }
}
