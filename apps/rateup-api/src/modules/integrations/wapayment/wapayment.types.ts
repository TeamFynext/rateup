/**
 * One payment configuration as Meta lists it (`GET /{waba}/payment_configurations`),
 * plus the verification link RateUp last generated for it. Meta does not list the
 * link again, so it is carried across syncs from the stored copy.
 */
export interface WaPaymentConfiguration {
  configuration_name: string;
  provider_name?: string;
  status?: string;
  purpose_code?: { code?: string; description?: string };
  merchant_category_code?: { code?: string; description?: string };
  oauth_url?: string;
  /** Unix seconds when `oauth_url` stops working. */
  expiration?: number;
  [field: string]: unknown;
}

/**
 * The stored list. The `waPayment` row's credential is an array of
 * configurations rather than an object, so it is read here once.
 */
export function readWaPaymentConfigurations(credential: unknown): WaPaymentConfiguration[] {
  return Array.isArray(credential)
    ? credential.filter(
        (entry): entry is WaPaymentConfiguration =>
          Boolean(entry) && typeof entry.configuration_name === "string",
      )
    : [];
}

/** A failure the settings page should show, with the status to answer it with. */
export class WaPaymentError extends Error {
  constructor(
    message: string,
    readonly statusCode: 404 | 502,
  ) {
    super(message);
    this.name = "WaPaymentError";
  }
}
