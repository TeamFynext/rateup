/**
 * Graph API error responses, in the shape Meta sends them.
 *
 * Used to make sends fail on purpose, so an app's failure handling can be
 * exercised without a real account in a real bad state — a WhatsApp Business
 * account with a broken payment method is not something anyone can conjure on
 * demand.
 *
 * Every code in Meta's Cloud API error reference is here, with Meta's own
 * `details` wording
 * (https://developers.facebook.com/documentation/business-messaging/whatsapp/support/error-codes).
 * Meta says not to build on titles, and does not publish them for most codes,
 * so titles are the ones Graph has been seen to put in `message`, or a short
 * paraphrase where none is known.
 *
 * `send` marks the codes a `POST /{phone-number-id}/messages` can actually come
 * back with. The rest belong to template management, phone migration, insights,
 * contact sync and onboarding — they can still be forced with `sendError`, but
 * random failures never pick them, because no real send ever returns them.
 */

import { randomBytes } from "node:crypto";

/**
 * Marks a handler's return value as a non-200 response. A symbol, so it never
 * leaks into the JSON body.
 */
export const HTTP_STATUS = Symbol("httpStatus");

/**
 * The account-level payment failure. Never picked at random: a campaign that
 * hits it pauses, so it has to be something a tester turns on deliberately.
 */
export const PAYMENT_METHOD_ERROR_CODE = 131042;

/**
 * @typedef {{ title: string, details: string, http?: number, send?: boolean }} ErrorSpec
 * `http` defaults to 400; `send` defaults to true.
 */

/** @type {Record<number, ErrorSpec>} */
const CATALOG = {
  /* ---- Authorization ---- */
  0: {
    title: "AuthException",
    details: "We were unable to authenticate the app user.",
    http: 401,
  },
  3: { title: "API Method", details: "Capability or permissions issue.", http: 403 },
  10: {
    title: "Permission Denied",
    details: "Permission is either not granted or has been removed.",
    http: 403,
  },
  190: { title: "Access token has expired", details: "Your access token has expired.", http: 401 },
  200: {
    title: "API Permission",
    details: "Permission is either not granted or has been removed.",
    http: 403,
  },

  /* ---- Integrity ---- */
  368: {
    title: "Temporarily blocked for policies violations",
    details:
      "The WhatsApp Business Account associated with the app has been restricted or disabled for violating a platform policy.",
  },
  130497: {
    title: "Business account is restricted from messaging users in this country",
    details: "The WhatsApp Business Account is restricted from messaging to users in certain countries.",
  },
  131031: {
    title: "Account has been locked",
    details:
      "The WhatsApp Business Account associated with the app has been restricted or disabled for violating a platform policy, or we were unable to verify data included in the request against data set on the WhatsApp Business Account (e.g, the two-step pin included in the request is incorrect).",
  },

  /* ---- Template creation (management only) ---- */
  2388039: {
    title: "Message template status can't be changed",
    details: "The status for this message template can't be changed. You can only delete or add templates.",
    send: false,
  },
  2388040: {
    title: "Character limit exceeded",
    details: "A field in your template has exceeded the maximum character limit allowed.",
    send: false,
  },
  2388047: {
    title: "Message header format is incorrect",
    details: "Your message header contains invalid formatting.",
    send: false,
  },
  2388072: {
    title: "Message body format is incorrect",
    details: "Your message body contains invalid formatting.",
    send: false,
  },
  2388073: {
    title: "Message footer format is incorrect",
    details: "Your message footer contains invalid formatting.",
    send: false,
  },
  2388293: {
    title: "Parameters words ratio exceeds limit",
    details:
      "This template has too many variables for its length. Reduce the number of variables or increase the message length.",
    send: false,
  },
  2388299: {
    title: "Leading or trailing parameters not allowed",
    details: "Variables cannot be at the start or end of the template.",
    send: false,
  },
  2388019: {
    title: "Message Template Limit Exceeded",
    details:
      "You have exceeded the maximum number of message templates you can have for this WhatsApp business account.",
    send: false,
  },

  /* ---- Phone migration (management only) ---- */
  2388012: {
    title: "This phone number already exists in your list of phone numbers.",
    details: "The phone number you are trying to migrate is already present in your WhatsApp account.",
    send: false,
  },
  2388091: {
    title:
      "This phone number isn't eligible to receive a registration code since it is not being migrated.",
    details: "Phone ownership verification APIs are not available for this use case.",
    send: false,
  },
  2388093: {
    title:
      "This phone number isn't eligible to verify a registration code since it is not being migrated.",
    details: "Phone ownership verification APIs are not available for this use case.",
    send: false,
  },
  2388103: {
    title: "Cannot migrate phone number.",
    details: "There was an error migrating this phone number.",
    send: false,
  },
  2494100: {
    title: "Account is in maintenance mode.",
    details: "The business phone number is in maintenance mode.",
    send: false,
  },

  /* ---- Template insights (management only) ---- */
  200005: {
    title: "Template insights unavailable",
    details: "Template insights are not available yet for this WhatsApp Business account.",
    send: false,
  },
  200006: {
    title: "Cannot disable template insights",
    details: "Invalid operation. Template Insights cannot be disabled once enabled.",
    send: false,
  },
  200007: {
    title: "Template Insights not enabled",
    details: "Template Insights have not been enabled for this WhatsApp Business Account",
    send: false,
  },

  /* ---- Business app synchronization (management only) ---- */
  2593107: {
    title: "Synchronization limit exceeded",
    details:
      "You have exceeded the maximum number of times to call the synchronization api for this phone number.",
    send: false,
  },
  2593108: {
    title: "Synchronization window expired",
    details: "Synchronization request can only be made within 24 hours of onboarding",
    send: false,
  },

  /* ---- Throttling ---- */
  4: { title: "API Too Many Calls", details: "The app has reached its API call rate limit." },
  80007: {
    title: "Rate limit issues",
    details: "The WhatsApp Business Account has reached its rate limit.",
  },
  130429: { title: "Rate limit hit", details: "Cloud API message throughput has been reached." },
  131048: {
    title: "Spam rate limit hit",
    details:
      "Message failed to send because there are restrictions on how many messages can be sent from this phone number. This may be because too many previous messages were blocked or flagged as spam.",
  },
  131056: {
    title: "(Business Account, Consumer Account) pair rate limit hit",
    details:
      "Too many messages sent from the sender phone number to the same recipient phone number in a short period of time.",
  },
  133016: {
    title: "Account register deregister rate limit exceeded",
    details:
      "Registration or Deregistration failed because there were too many attempts for this phone number in a short period of time",
    send: false,
  },
  131064: {
    title: "Messaging limit due to template classification violations",
    details:
      "Message failed to send because this account has reached its messaging limit due to template classification violations. This applies to both template messages and direct send messages.",
  },

  /* ---- Other ---- */
  1: { title: "API Unknown", details: "Invalid request or possible server error.", http: 500 },
  2: {
    title: "API Service",
    details: "Temporary due to downtime or due to being overloaded.",
    http: 503,
  },
  33: { title: "Parameter value is not valid", details: "The business phone number has been deleted." },
  100: {
    title: "Invalid parameter",
    details: "The request included one or more unsupported or misspelled parameters.",
  },
  130403: {
    title: "Recipient blocked by business",
    details: "Unable to deliver the message. This business has blocked the end user on WhatsApp",
  },
  130472: {
    title: "User's number is part of an experiment",
    details: "Message was not sent as part of an experiment.",
  },
  131000: {
    title: "Something went wrong",
    details: "Message failed to send due to an unknown error.",
    http: 500,
  },
  131005: {
    title: "Access denied",
    details: "Permission is either not granted or has been removed.",
    http: 403,
  },
  131008: {
    title: "Required parameter is missing",
    details: "The request is missing a required parameter.",
  },
  131009: {
    title: "Parameter value is not valid",
    details: "One or more parameter values are invalid.",
  },
  131016: {
    title: "Service unavailable",
    details: "A service is temporarily unavailable.",
    http: 503,
  },
  131021: {
    title: "Recipient cannot be sender",
    details: "Sender and recipient phone number is the same.",
  },
  131026: {
    title: "Message Undeliverable",
    details:
      "Unable to deliver message. Reasons can include: the recipient phone number is not a WhatsApp phone number, the recipient has not accepted the new Terms of Service and Privacy Policy, or the recipient is using an old WhatsApp version.",
  },
  131037: {
    title: "WhatsApp provided number needs display name approval before message can be sent",
    details:
      "The 555 business phone number used to send the request does not have an approved display name.",
  },
  [PAYMENT_METHOD_ERROR_CODE]: {
    title: "Business eligibility payment issue",
    details: "There was an error related to your payment method.",
  },
  131045: {
    title: "Incorrect certificate",
    details: "Message failed to send due to a phone number registration error.",
  },
  131047: {
    title: "Re-engagement message",
    details: "More than 24 hours have passed since the recipient last replied to the sender number.",
  },
  131049: {
    title: "Meta chose not to deliver",
    details: "This message was not delivered to maintain healthy ecosystem engagement.",
  },
  131050: {
    title: "Unable to deliver the message",
    details:
      "Unable to deliver the message. This recipient has chosen to stop receiving marketing messages on WhatsApp from your business.",
  },
  131051: { title: "Unsupported message type", details: "Unsupported message type." },
  131052: {
    title: "Media download error",
    details: "Unable to download the media sent by the user.",
    send: false,
  },
  131053: { title: "Media upload error", details: "Unable to upload the media used in the message." },
  131057: {
    title: "Account in maintenance mode",
    details: "Business Account is in maintenance mode",
  },
  131063: {
    title: "Marketing templates disabled on Cloud API",
    details:
      "Your template is categorized as Marketing, but marketing templates are currently disabled for your Cloud API configuration.",
  },
  132000: {
    title: "Template Param Count Mismatch",
    details:
      "The number of variable parameter values included in the request did not match the number of variable parameters defined in the template.",
  },
  132001: {
    title: "Template does not exist",
    details:
      "The template does not exist in the specified language or the template has not been approved.",
    http: 404,
  },
  132005: { title: "Template Hydrated Text Too Long", details: "Translated text is too long." },
  132007: {
    title: "Template Format Character Policy Violated",
    details: "Template content violates a WhatsApp policy.",
  },
  132012: {
    title: "Template Parameter Format Mismatch",
    details: "Variable parameter values formatted incorrectly.",
  },
  132015: {
    title: "Template is Paused",
    details:
      "Template is paused due to low quality so it cannot be sent in a template message.",
  },
  132016: {
    title: "Template is Disabled",
    details:
      "Template has been paused too many times due to low quality and is now permanently disabled.",
  },
  132068: { title: "Flow is blocked", details: "Flow is in blocked state." },
  132069: {
    title: "Flow is throttled",
    details:
      "Flow is in throttled state and 10 messages using this flow were already sent in the last hour.",
  },
  133000: {
    title: "Incomplete Deregistration",
    details: "A previous deregistration attempt failed.",
    send: false,
  },
  133004: {
    title: "Server Temporarily Unavailable",
    details: "Server is temporarily unavailable.",
    http: 503,
  },
  133005: {
    title: "Two step verification PIN Mismatch",
    details: "Two-step verification PIN incorrect.",
    send: false,
  },
  133006: {
    title: "Phone number re-verification needed",
    details: "Phone number needs to be verified before registering.",
    send: false,
  },
  133008: {
    title: "Too Many two step verification PIN Guesses",
    details: "Too many two-step verification PIN guesses for this phone number.",
    send: false,
  },
  133009: {
    title: "Two step verification PIN Guessed Too Fast",
    details: "Two-step verification PIN was entered too quickly.",
    send: false,
  },
  133010: {
    title: "Phone number Not Registered",
    details: "Phone number not registered on the WhatsApp Business Platform.",
  },
  133015: {
    title: "Please wait a few minutes before attempting to register this phone number",
    details:
      "The phone number you are attempting to register was recently deleted, and deletion has not yet completed.",
    send: false,
  },
  134011: {
    title: "WhatsApp Payments terms of service not accepted",
    details:
      "Message failed to send because WhatsApp Payments terms of service acceptance is pending for this WhatsApp Business Account.",
  },
  135000: {
    title: "Generic user error",
    details: "Message failed to send because of an unknown error with your request parameters.",
  },

  /* ---- Marketing Messages API for WhatsApp ---- */
  131055: {
    title: "Method not allowed",
    details: "Only marketing template messages are supported",
  },
  134100: {
    title: "Only marketing messages supported",
    details: "You're only able to send marketing messages on this API.",
  },
  134101: {
    title: "Your template is still syncing",
    details:
      "When you send a message from a template, the template syncing process can take up to 10 minutes to complete. Wait a few minutes, and then try sending your message again.",
  },
  134102: {
    title: "Template unavailable for use",
    details:
      "Please check your eligibility status to ensure you are onboarded or contact Meta's customer support.",
    http: 500,
  },
  132018: {
    title: "Template validation error",
    details: "There's an issue with the parameters in your template.",
  },
  1752041: {
    title: "Duplicate Request",
    details:
      "Duplicate Request is thrown when a client has already been invited to onboard by any partner.",
    send: false,
  },
};

/** Every code in the catalog. */
export const KNOWN_ERROR_CODES = Object.keys(CATALOG)
  .map(Number)
  .sort((a, b) => a - b);

/**
 * What random send failures draw from by default: every code a send can
 * return, except the payment failure.
 */
export const RANDOM_SEND_ERROR_CODES = KNOWN_ERROR_CODES.filter(
  (code) => CATALOG[code].send !== false && code !== PAYMENT_METHOD_ERROR_CODE,
);

/**
 * Parse a configured error code. Blank, "off", "none" and "false" all mean no
 * error — so `META_MOCK_SEND_ERROR=` in a `.env` switches it off rather than
 * failing every send with code NaN.
 */
export function parseErrorCode(value) {
  if (value === undefined || value === null) return null;
  const text = String(value).trim().toLowerCase();
  if (text === "" || text === "off" || text === "none" || text === "false") return null;
  const code = Number(text);
  return Number.isInteger(code) ? code : null;
}

/**
 * Parse a list of codes — an array, or a comma/space separated string. Blank
 * means "the default pool", returned as null.
 */
export function parseErrorCodes(value) {
  if (value === undefined || value === null) return null;
  const parts = Array.isArray(value) ? value : String(value).split(/[\s,]+/);
  const codes = parts.map(parseErrorCode).filter((code) => code !== null);
  return codes.length ? codes : null;
}

/** A fraction in [0, 1]; anything else is 0. */
export function parseRate(value) {
  const rate = Number(value ?? 0);
  return Number.isFinite(rate) ? Math.min(Math.max(rate, 0), 1) : 0;
}

/** A Graph error body for `code`, tagged with its HTTP status. */
export function graphError(code) {
  const spec = CATALOG[code];
  const title = spec?.title ?? "Simulated error";
  const details = spec?.details ?? `Simulated Graph API error ${code}.`;
  return {
    [HTTP_STATUS]: spec?.http ?? 400,
    error: {
      message: `(#${code}) ${title}`,
      type: "OAuthException",
      code,
      error_data: { messaging_product: "whatsapp", details },
      fbtrace_id: `mock-${randomBytes(9).toString("base64url")}`,
    },
  };
}
