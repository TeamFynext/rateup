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
  /** Nothing about waiting changes the outcome. Never retried. */
  PERMANENT = "PERMANENT",
  /** Not in the table below. Never retried — see `classifyWaFailure`. */
  UNKNOWN = "UNKNOWN",
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
 * Explicitly classified codes. Ranges (the 132xxx template block) are handled
 * in `classifyWaFailure` after this lookup misses.
 */
const WA_ERROR_SPECS: ReadonlyMap<number, WaErrorSpec> = new Map<number, WaErrorSpec>([
  // ── Frequency caps ───────────────────────────────────────────────────────
  [
    131049,
    {
      class: WaFailureClass.FREQUENCY_CAP,
      group: WaFailureReasonGroup.LIMITED_BY_META,
      label: "Meta limited marketing messages to this contact",
    },
  ],
  [
    130472,
    {
      class: WaFailureClass.FREQUENCY_CAP,
      group: WaFailureReasonGroup.LIMITED_BY_META,
      label: "Contact is in a Meta experiment group",
    },
  ],

  // ── Transient ────────────────────────────────────────────────────────────
  [
    130429,
    {
      class: WaFailureClass.TRANSIENT,
      group: WaFailureReasonGroup.LIMITED_BY_META,
      label: "Sending rate limit reached",
    },
  ],
  [
    131048,
    {
      class: WaFailureClass.TRANSIENT,
      group: WaFailureReasonGroup.LIMITED_BY_META,
      label: "Spam rate limit reached",
    },
  ],
  [
    368,
    {
      class: WaFailureClass.TRANSIENT,
      group: WaFailureReasonGroup.LIMITED_BY_META,
      label: "Temporarily blocked for policy violations",
    },
  ],
  [
    133016,
    {
      class: WaFailureClass.TRANSIENT,
      group: WaFailureReasonGroup.OTHER,
      label: "Account temporarily unavailable, try again shortly",
    },
  ],
  // Meta's generic "API Unknown" / "API Service" pair. Both are documented as
  // temporary and are what a 500 from Graph usually arrives as.
  [
    1,
    {
      class: WaFailureClass.TRANSIENT,
      group: WaFailureReasonGroup.OTHER,
      label: "Temporary Meta API error",
    },
  ],
  [
    2,
    {
      class: WaFailureClass.TRANSIENT,
      group: WaFailureReasonGroup.OTHER,
      label: "Meta API temporarily unavailable",
    },
  ],

  // ── Permanent ────────────────────────────────────────────────────────────
  [
    131026,
    {
      class: WaFailureClass.PERMANENT,
      group: WaFailureReasonGroup.INVALID_NUMBER,
      label: "Number is not on WhatsApp or cannot receive messages",
    },
  ],
  [
    131047,
    {
      class: WaFailureClass.PERMANENT,
      group: WaFailureReasonGroup.OTHER,
      label: "Outside the 24-hour window — a template is required",
    },
  ],
  [
    131051,
    {
      class: WaFailureClass.PERMANENT,
      group: WaFailureReasonGroup.OTHER,
      label: "Unsupported message type",
    },
  ],
  [
    131008,
    {
      class: WaFailureClass.PERMANENT,
      group: WaFailureReasonGroup.OTHER,
      label: "Required parameter is missing",
    },
  ],
  [
    133010,
    {
      class: WaFailureClass.PERMANENT,
      group: WaFailureReasonGroup.OTHER,
      label: "Phone number is not registered",
    },
  ],
]);

/** The 132xxx block is entirely template problems: mismatched, paused, disabled. */
const TEMPLATE_ERROR_MIN = 132000;
const TEMPLATE_ERROR_MAX = 132999;

const TEMPLATE_ERROR_SPEC: WaErrorSpec = {
  class: WaFailureClass.PERMANENT,
  group: WaFailureReasonGroup.TEMPLATE_ISSUE,
  label: "Template was rejected, paused, or does not match the parameters sent",
};

const UNKNOWN_SPEC: WaErrorSpec = {
  class: WaFailureClass.UNKNOWN,
  group: WaFailureReasonGroup.OTHER,
  label: "Unrecognised error",
};

function specFor(code: number | null | undefined, httpStatus?: number): WaErrorSpec {
  if (typeof code === "number") {
    const known = WA_ERROR_SPECS.get(code);
    if (known) return known;
    if (code >= TEMPLATE_ERROR_MIN && code <= TEMPLATE_ERROR_MAX) return TEMPLATE_ERROR_SPEC;
  }
  // A 5xx is Meta's problem, whatever code it carried. Checked after the code
  // table so a documented permanent failure served with a 500 is still permanent.
  if (typeof httpStatus === "number" && httpStatus >= 500 && httpStatus <= 599) {
    return {
      class: WaFailureClass.TRANSIENT,
      group: WaFailureReasonGroup.OTHER,
      label: "Meta API temporarily unavailable",
    };
  }
  return UNKNOWN_SPEC;
}

/**
 * An unmapped code returns `UNKNOWN`, and `UNKNOWN` is deliberately **not**
 * retried. A code we have never seen is far more likely to be a permanent
 * configuration error than a transient blip, and every speculative retry spends
 * a conversation out of the org's allowance to find that out.
 */
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
  const failureClass = classifyWaFailure(code);
  return failureClass === WaFailureClass.FREQUENCY_CAP || failureClass === WaFailureClass.TRANSIENT;
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
    description: "Frequency caps and rate limits. These are the failures retries recover.",
  },
  {
    group: WaFailureReasonGroup.INVALID_NUMBER,
    label: "Invalid number",
    description: "The number is not reachable on WhatsApp.",
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
  .filter(
    ([, spec]) =>
      spec.class === WaFailureClass.FREQUENCY_CAP || spec.class === WaFailureClass.TRANSIENT,
  )
  .map(([code]) => code);
