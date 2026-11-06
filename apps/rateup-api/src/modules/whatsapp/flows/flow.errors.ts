/**
 * Errors that map onto the status codes WhatsApp's Flows endpoint understands.
 *
 * Lives in its own module because both the encryption layer (which decrypts the
 * request and writes the response) and the flow handler (which decides the run
 * is unusable) raise them, and those two import each other's siblings.
 *
 * See https://developers.facebook.com/docs/whatsapp/flows/reference/error-codes
 */
export class FlowEndpointException extends Error {
  statusCode: number;
  /** Shown to the respondent when the client is told to close the flow. */
  errorMessage?: string;

  constructor(statusCode: number, message: string, errorMessage?: string) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.errorMessage = errorMessage;
  }
}

/**
 * 421 — the request could not be decrypted. Meta re-fetches our public key and
 * retries, which is how a rotated key heals itself.
 */
export function undecryptableRequest(message: string) {
  return new FlowEndpointException(421, message);
}

/**
 * 427 — the request is intelligible but must not be served: a bad signature, or
 * a flow token that no longer identifies a run. The client closes the flow and
 * shows `errorMessage`.
 */
export function unusableRequest(message: string, errorMessage: string) {
  return new FlowEndpointException(427, message, errorMessage);
}
