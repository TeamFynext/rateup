/**
 * What a Meta Graph failure means, and whether it is worth trying again.
 *
 * This lives in `src/utils/` rather than in either consumer because it is read
 * from both sides of the Prisma boundary: the API modules classify a code to
 * build the failure breakdown and pick a retry cohort, and `workers/shared/`
 * — which talks to Postgres through a raw `pg.Pool` and has no Prisma client —
 * classifies the same code at send time. Keep it dependency-free so it stays
 * importable from both.
 *
 * The codes come from Meta's Cloud API error reference. They are grouped by
 * what a retry would actually accomplish, not by Meta's own numbering: two
 * codes in the same 131xxx block can be a temporary throttle and a permanently
 * undeliverable number.
 */

export enum WaFailureClass {
  /**
   * Meta refused because *this recipient* has had too much marketing recently.
   * The message is fine and the number is fine; the same send an hour later
   * often lands. This is the case the retry engine exists for.
   */
  FREQUENCY_CAP = "FREQUENCY_CAP",
  /** A throttle, a blip, or Meta being briefly unwell. Retry, soon. */
  TRANSIENT = "TRANSIENT",
  /**
   * Not sendable now, but the condition lifts on a timescale of hours or days:
   * a 24-hour window that has closed, an enforcement period, a flow throttle,
   * a template still syncing.
   *
   * Worth another *campaign* attempt later. Deliberately *not* `TRANSIENT`: an
   * immediate in-process retry seconds later only returns the same code again,
   * so the dispatcher must not spend its BullMQ attempts on it.
   */
  RETRY_LATER = "RETRY_LATER",
  /**
   * Nothing about waiting changes the outcome. Never retried.
   *
   * Also what every code *not* in the table below gets — see `classifyWaFailure`.
   */
  PERMANENT = "PERMANENT",
}

/** Which bucket the analytics failure breakdown files a code under. */
export enum WaFailureReasonGroup {
  LIMITED_BY_META = "LIMITED_BY_META",
  INVALID_NUMBER = "INVALID_NUMBER",
  TEMPLATE_ISSUE = "TEMPLATE_ISSUE",
  OTHER = "OTHER",
}

interface WaErrorSpec {
  class: WaFailureClass;
  group: WaFailureReasonGroup;
  /**
   * Wording fit to show a customer in a failure breakdown. Meta's own
   * `error_user_msg` is preferred when a response carries one; this is the
   * fallback, and it is the only thing available when all we have kept is the
   * code. Without it the breakdown renders "Graph error 131026", which is what
   * `metaErrorMessage` returns today.
   */
  label: string;
}

/**
 * The request never reached Meta — DNS, a refused connection, a socket timeout.
 *
 * Negative because Meta's own codes are positive, so it can share the `errorCode`
 * column and every reader that classifies a code — the retry cohort's
 * `errorCode = ANY(...)` filter, the failure breakdown, the participants table —
 * handles it without a second column or a special case. Nothing was sent and no
 * conversation was spent, which is what makes it the most retryable failure
 * there is.
 */
export const WA_TRANSPORT_ERROR_CODE = -1;

const { FREQUENCY_CAP, TRANSIENT, RETRY_LATER, PERMANENT } = WaFailureClass;
const { LIMITED_BY_META, INVALID_NUMBER, TEMPLATE_ISSUE, OTHER } = WaFailureReasonGroup;

function spec(cls: WaFailureClass, group: WaFailureReasonGroup, label: string): WaErrorSpec {
  return { class: cls, group, label };
}

/**
 * Explicitly classified codes, from Meta's Cloud API error reference
 * (https://developers.facebook.com/documentation/business-messaging/whatsapp/support/error-codes).
 *
 * Every code in the reference is listed, including the management-side ones
 * (template creation, phone migration, insights, contact sync) that a send can
 * never return, so that the table *is* the spec and nothing has to be
 * inferred. Ranges (200–299 permissions, the 132xxx template block) are
 * handled in `specFor` after this lookup misses; anything else is permanent.
 *
 * Meta's own retry advice for a code ("try again", "do not retry", "wait 24
 * hours") is what decides the class; the group is what a customer reading the
 * failure breakdown would want it filed under.
 */
const WA_ERROR_SPECS: ReadonlyMap<number, WaErrorSpec> = new Map<number, WaErrorSpec>([
  // ── Frequency caps ───────────────────────────────────────────────────────
  [131049, spec(FREQUENCY_CAP, LIMITED_BY_META, "Meta limited marketing messages to this contact")],
  [130472, spec(FREQUENCY_CAP, LIMITED_BY_META, "Contact is in a Meta experiment group")],

  // ── Transient ────────────────────────────────────────────────────────────
  [WA_TRANSPORT_ERROR_CODE, spec(TRANSIENT, OTHER, "Could not reach WhatsApp")],
  // Meta's generic "API Unknown" / "API Service" pair. Both are documented as
  // temporary and are what a 500 from Graph usually arrives as.
  [1, spec(TRANSIENT, OTHER, "Temporary Meta API error")],
  [2, spec(TRANSIENT, OTHER, "Meta API temporarily unavailable")],
  // "Something went wrong": the messages endpoint's own unknown-error code.
  [131000, spec(TRANSIENT, OTHER, "Temporary WhatsApp error, try again later")],
  [131016, spec(TRANSIENT, OTHER, "WhatsApp service temporarily unavailable")],
  [133004, spec(TRANSIENT, OTHER, "WhatsApp server temporarily unavailable")],
  // Throughput and rate limits. All lift on their own within minutes.
  [4, spec(TRANSIENT, LIMITED_BY_META, "App API call rate limit reached")],
  [80007, spec(TRANSIENT, LIMITED_BY_META, "Account rate limit reached")],
  [130429, spec(TRANSIENT, LIMITED_BY_META, "Sending rate limit reached")],
  [131048, spec(TRANSIENT, LIMITED_BY_META, "Spam rate limit reached")],
  [131056, spec(TRANSIENT, LIMITED_BY_META, "Too many messages to this contact in a short period")],
  [368, spec(TRANSIENT, LIMITED_BY_META, "Temporarily blocked for policy violations")],
  [131057, spec(TRANSIENT, OTHER, "Account is in maintenance mode")],
  // Registration blips on the *sender* number.
  [133015, spec(TRANSIENT, OTHER, "Phone number deletion still completing, try again shortly")],
  [133016, spec(TRANSIENT, OTHER, "Account temporarily unavailable, try again shortly")],
  [
    2494100,
    spec(TRANSIENT, OTHER, "Phone number is in maintenance mode, try again in a few minutes"),
  ],

  // ── Not deliverable now, worth one more campaign attempt later ───────────
  [131047, spec(RETRY_LATER, OTHER, "Outside the 24-hour window — a template is required")],
  // Lifted after an enforcement period measured in days, not minutes.
  [
    131064,
    spec(
      RETRY_LATER,
      LIMITED_BY_META,
      "Messaging limit reached due to template classification violations",
    ),
  ],
  // Flow throttle: 10 per hour. Nothing an in-process backoff can wait out.
  [132069, spec(RETRY_LATER, TEMPLATE_ISSUE, "Flow is throttled, try again in an hour")],
  // Marketing Messages API: a new template can take ten minutes to sync.
  [
    134101,
    spec(RETRY_LATER, TEMPLATE_ISSUE, "Template is still syncing, try again in a few minutes"),
  ],

  // ── Permanent: the recipient ─────────────────────────────────────────────
  // Not on WhatsApp, old client, or unaccepted terms. Meta's fix is to reach
  // the person another way; resending only returns 131026 again.
  [131026, spec(PERMANENT, INVALID_NUMBER, "Number could not receive the message")],
  [130403, spec(PERMANENT, OTHER, "This business has blocked the contact on WhatsApp")],
  [131021, spec(PERMANENT, INVALID_NUMBER, "Recipient is the sender's own number")],
  [
    131050,
    spec(PERMANENT, INVALID_NUMBER, "Contact opted out of marketing messages from this business"),
  ],
  [
    130497,
    spec(PERMANENT, OTHER, "Messaging to this contact's country is restricted for this account"),
  ],

  // ── Permanent: the request ───────────────────────────────────────────────
  [100, spec(PERMANENT, OTHER, "Invalid or unsupported request parameter")],
  [131008, spec(PERMANENT, OTHER, "Required parameter is missing")],
  [131009, spec(PERMANENT, OTHER, "A parameter value is invalid")],
  [131051, spec(PERMANENT, OTHER, "Unsupported message type")],
  [131052, spec(PERMANENT, OTHER, "Media sent by the contact could not be downloaded")],
  [131053, spec(PERMANENT, OTHER, "Media could not be uploaded")],
  [135000, spec(PERMANENT, OTHER, "Unknown error with the request parameters")],

  // ── Permanent: the account / sender number ───────────────────────────────
  [0, spec(PERMANENT, OTHER, "WhatsApp access token is invalid or expired")],
  [3, spec(PERMANENT, OTHER, "App is missing a required WhatsApp permission")],
  [10, spec(PERMANENT, OTHER, "WhatsApp permission not granted or removed")],
  [190, spec(PERMANENT, OTHER, "WhatsApp access token has expired")],
  [131005, spec(PERMANENT, OTHER, "WhatsApp permission not granted or removed")],
  [33, spec(PERMANENT, OTHER, "Business phone number has been deleted")],
  [131031, spec(PERMANENT, OTHER, "Account restricted or disabled for a policy violation")],
  [131037, spec(PERMANENT, OTHER, "Business display name is not approved")],
  [131042, spec(PERMANENT, OTHER, "Problem with the account's payment method")],
  [131045, spec(PERMANENT, OTHER, "Phone number registration error")],
  [133000, spec(PERMANENT, OTHER, "A previous phone number deregistration failed")],
  [133005, spec(PERMANENT, OTHER, "Two-step verification PIN is incorrect")],
  [133006, spec(PERMANENT, OTHER, "Phone number must be verified before registering")],
  [133008, spec(PERMANENT, OTHER, "Too many two-step verification PIN attempts")],
  [133009, spec(PERMANENT, OTHER, "Two-step verification PIN entered too quickly")],
  [133010, spec(PERMANENT, OTHER, "Phone number is not registered")],
  [134011, spec(PERMANENT, OTHER, "WhatsApp Payments terms of service not yet accepted")],

  // ── Permanent: the template ──────────────────────────────────────────────
  // Specific 132xxx codes get their own wording; the rest of the block falls
  // through to `TEMPLATE_ERROR_SPEC`.
  [
    131063,
    spec(
      PERMANENT,
      TEMPLATE_ISSUE,
      "Marketing templates are disabled on Cloud API for this account",
    ),
  ],
  [132000, spec(PERMANENT, TEMPLATE_ISSUE, "Wrong number of template parameters")],
  [
    132001,
    spec(PERMANENT, TEMPLATE_ISSUE, "Template does not exist in this language or is not approved"),
  ],
  [132005, spec(PERMANENT, TEMPLATE_ISSUE, "Translated template text is too long")],
  [132007, spec(PERMANENT, TEMPLATE_ISSUE, "Template content violates a WhatsApp policy")],
  [132012, spec(PERMANENT, TEMPLATE_ISSUE, "Template parameter values are formatted incorrectly")],
  [132015, spec(PERMANENT, TEMPLATE_ISSUE, "Template is paused due to low quality")],
  [132016, spec(PERMANENT, TEMPLATE_ISSUE, "Template is permanently disabled due to low quality")],
  [132018, spec(PERMANENT, TEMPLATE_ISSUE, "Template parameters failed validation")],
  [132068, spec(PERMANENT, TEMPLATE_ISSUE, "Flow is blocked")],
  // Marketing Messages API only accepts marketing templates.
  [131055, spec(PERMANENT, TEMPLATE_ISSUE, "Only marketing template messages are supported")],
  [134100, spec(PERMANENT, TEMPLATE_ISSUE, "Only marketing template messages are supported")],
  [134102, spec(PERMANENT, TEMPLATE_ISSUE, "Template is unavailable for use")],

  // ── Permanent: management endpoints, never returned by a send ────────────
  // Template creation and editing.
  [2388019, spec(PERMANENT, TEMPLATE_ISSUE, "Account has reached its template limit")],
  [2388039, spec(PERMANENT, TEMPLATE_ISSUE, "Template status cannot be changed")],
  [2388040, spec(PERMANENT, TEMPLATE_ISSUE, "Template field exceeds its character limit")],
  [2388047, spec(PERMANENT, TEMPLATE_ISSUE, "Template header format is incorrect")],
  [2388072, spec(PERMANENT, TEMPLATE_ISSUE, "Template body format is incorrect")],
  [2388073, spec(PERMANENT, TEMPLATE_ISSUE, "Template footer format is incorrect")],
  [2388293, spec(PERMANENT, TEMPLATE_ISSUE, "Template has too many variables for its length")],
  [2388299, spec(PERMANENT, TEMPLATE_ISSUE, "Template cannot start or end with a variable")],
  // Phone number migration.
  [2388012, spec(PERMANENT, OTHER, "Phone number already exists in this account")],
  [2388091, spec(PERMANENT, OTHER, "Phone number is not being migrated")],
  [2388093, spec(PERMANENT, OTHER, "Phone number is not being migrated")],
  [2388103, spec(PERMANENT, OTHER, "Phone number cannot be migrated")],
  // Template insights.
  [200005, spec(PERMANENT, OTHER, "Template insights are not available for this account")],
  [200006, spec(PERMANENT, OTHER, "Template insights cannot be disabled")],
  [200007, spec(PERMANENT, OTHER, "Template insights are not enabled for this account")],
  // Business app contact / history sync.
  [2593107, spec(PERMANENT, OTHER, "Synchronisation limit reached for this phone number")],
  [
    2593108,
    spec(PERMANENT, OTHER, "Synchronisation is only possible within 24 hours of onboarding"),
  ],
  // Marketing Messages API onboarding.
  [1752041, spec(PERMANENT, OTHER, "Onboarding request already submitted by another partner")],
]);

/**
 * Graph's permission block. Meta documents 200–299 as one family: the token
 * lacks a permission or had it removed. Nothing about waiting fixes that.
 */
const PERMISSION_ERROR_MIN = 200;
const PERMISSION_ERROR_MAX = 299;

const PERMISSION_ERROR_SPEC: WaErrorSpec = spec(
  PERMANENT,
  OTHER,
  "WhatsApp permission not granted or removed",
);

/** The 132xxx block is entirely template problems: mismatched, paused, disabled. */
const TEMPLATE_ERROR_MIN = 132000;
const TEMPLATE_ERROR_MAX = 132999;

const TEMPLATE_ERROR_SPEC: WaErrorSpec = spec(
  PERMANENT,
  TEMPLATE_ISSUE,
  "Template was rejected, paused, or does not match the parameters sent",
);

/**
 * Anything Meta's reference does not list. Permanent, so never retried: a code
 * we have never seen is far more likely to be a configuration error than a
 * blip, and every speculative retry spends a conversation out of the org's
 * allowance to find that out. Kept as its own object so `waFailureLabel` can
 * still surface the raw code for support.
 */
const UNKNOWN_SPEC: WaErrorSpec = spec(PERMANENT, OTHER, "Unrecognised error");

function specFor(code: number | null | undefined, httpStatus?: number): WaErrorSpec {
  if (typeof code === "number") {
    const known = WA_ERROR_SPECS.get(code);
    if (known) return known;
    if (code >= TEMPLATE_ERROR_MIN && code <= TEMPLATE_ERROR_MAX) return TEMPLATE_ERROR_SPEC;
    if (code >= PERMISSION_ERROR_MIN && code <= PERMISSION_ERROR_MAX) return PERMISSION_ERROR_SPEC;
  }
  // A 5xx is Meta's problem, whatever code it carried. Checked after the code
  // table so a documented permanent failure served with a 500 is still permanent.
  if (typeof httpStatus === "number" && httpStatus >= 500 && httpStatus <= 599) {
    return spec(TRANSIENT, OTHER, "Meta API temporarily unavailable");
  }
  return UNKNOWN_SPEC;
}

/** An unmapped code is `PERMANENT` — see `UNKNOWN_SPEC`. */
export function classifyWaFailure(code?: number | null, httpStatus?: number): WaFailureClass {
  return specFor(code, httpStatus).class;
}

/** Which breakdown row a failure belongs in. */
export function waFailureReasonGroup(code?: number | null): WaFailureReasonGroup {
  return specFor(code).group;
}

/** Customer-facing wording for a code, for the failure breakdown. */
export function waFailureLabel(code?: number | null): string {
  const spec = specFor(code);
  if (spec === UNKNOWN_SPEC && typeof code === "number") return `Unrecognised error (${code})`;
  return spec.label;
}

/**
 * The minimum a caller has to know about a retry policy to decide eligibility.
 * Structural so both the Prisma `CampaignRetryPolicy` row and a raw `pg` row
 * satisfy it without either side importing the other's types.
 */
export interface RetryEligibilityPolicy {
  enabled: boolean;
}

/**
 * Whether a failure with this code should be re-attempted under this policy.
 *
 * Retries are opt-in: with no policy, or a disabled one, nothing is retryable
 * however transient the failure looks.
 */
export function isRetryable(
  code: number | null | undefined,
  policy: RetryEligibilityPolicy | null | undefined,
): boolean {
  if (!policy?.enabled) return false;
  return isRetryableClass(classifyWaFailure(code));
}

/**
 * Whether a class earns another *campaign* attempt.
 *
 * Not the same question as "retry this send in-process now" — that one is
 * `TRANSIENT` alone, and the dispatcher asks it directly.
 */
export function isRetryableClass(failureClass: WaFailureClass): boolean {
  return (
    failureClass === WaFailureClass.FREQUENCY_CAP ||
    failureClass === WaFailureClass.TRANSIENT ||
    failureClass === WaFailureClass.RETRY_LATER
  );
}

/** Whether a code, on its own, is one the retry engine would pick up. */
export function isRetryableCode(code?: number | null): boolean {
  return isRetryableClass(classifyWaFailure(code));
}

/** Display metadata for the analytics failure breakdown, in render order. */
export const FAILURE_REASON_GROUPS: ReadonlyArray<{
  group: WaFailureReasonGroup;
  label: string;
  description: string;
}> = [
  {
    group: WaFailureReasonGroup.LIMITED_BY_META,
    label: "Limited by Meta",
    description: "Frequency caps and rate limits. Retries recover these.",
  },
  {
    group: WaFailureReasonGroup.INVALID_NUMBER,
    label: "Undeliverable",
    description: "The number did not accept the message; some are worth another attempt.",
  },
  {
    group: WaFailureReasonGroup.TEMPLATE_ISSUE,
    label: "Template issue",
    description: "The template was rejected, paused, or its parameters did not match.",
  },
  {
    group: WaFailureReasonGroup.OTHER,
    label: "Other",
    description: "Everything else, including errors we have not classified.",
  },
];

/**
 * Codes a retry cohort may include. Used to build the `errorCode = ANY(...)`
 * filter in the cohort query rather than classifying row by row in JS.
 */
export const RETRYABLE_ERROR_CODES: readonly number[] = [...WA_ERROR_SPECS.entries()]
  .filter(([, spec]) => isRetryableClass(spec.class))
  .map(([code]) => code);
