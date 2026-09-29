/**
 * A connect that failed in a way the user should be told about. Answered with
 * its status and message by the shared OAuth callback route.
 *
 * Its own module so a provider's `connect` can throw it: `oauthConnect.ts`
 * imports `config.ts`, which the provider registry must not pull in.
 */
export class OAuthConnectError extends Error {
  constructor(
    message: string,
    readonly statusCode: 400 | 404 | 409,
  ) {
    super(message);
    this.name = "OAuthConnectError";
  }
}
