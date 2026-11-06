import axios from "axios";
import type { Integration } from "../../../../../generated/prisma/client.js";

/**
 * Rateup events forwarded to GetLead, gated per-org by `triggerSubscriptions`.
 * The values are stored on every org's credential and on queued jobs, so they
 * never change.
 *
 * `NOTE_CREATE` has a switch on the settings page and a handler in the push,
 * but no event queues it yet.
 */
export enum GetLeadTriggers {
  LEAD_CREATE = "getlead_lead_create",
  LEAD_UPDATE = "getlead_lead_update",
  NOTE_CREATE = "getlead_note_create",
}

/** One `{id, name}` row from `GET /meta` — a source, status or purpose. */
export interface GetLeadRef {
  id: string;
  name: string;
}

/** A custom field definition from `GET /meta`. Empty on every business so far. */
export interface GetLeadCustomFieldMeta {
  field_key: string;
  field_type?: string;
  allowed_values?: { value: string; label?: string }[];
}

/** The `data` object of `GET /api/v1/meta`. */
export interface GetLeadMeta {
  sources: GetLeadRef[];
  statuses: GetLeadRef[];
  purposes: GetLeadRef[];
  custom_fields: GetLeadCustomFieldMeta[];
}

/**
 * A board column mapped onto a GetLead status.
 *
 * Unlike the Zoho equivalent there is no name-matching fallback: `status_id` is a
 * ULID, so an unmapped column cannot be guessed at and simply pushes no status.
 */
export interface GetLeadStageMapping {
  stageId: string;
  stageName?: string;
  getleadStatusId: string;
  getleadStatusName?: string;
}

/** One row of `credential.triggerSubscriptions` — a Rateup event we forward. */
export interface GetLeadTriggerSubscription {
  /** A GetLeadTriggers value; compared against the incoming trigger key. */
  subscribed_field: string;
  active: boolean;
}

/**
 * The shape stored in `Integration.credential` for the GetLead integration.
 *
 * There is deliberately no `businessId`: the API key implies the business, and
 * `GET /meta` exposes no business identity to populate one from.
 */
export interface GetLeadCredential {
  /** The `ik_...` key the user pastes. The API has no refresh flow. */
  apiKey: string;
  /** Overridable for staging. Defaults to https://v3.getleadcrm.com */
  baseUrl?: string;

  /** Cached `GET /meta`, so reference data is not re-fetched on every push. */
  meta?: GetLeadMeta & { fetchedAt: string };

  /** What a push uses when the board has nothing more specific. */
  defaults?: {
    sourceId?: string;
    statusId?: string;
    purposeIds?: string[];
    assignedToId?: string;
  };

  stageMappings?: GetLeadStageMapping[];
  triggerSubscriptions?: GetLeadTriggerSubscription[];
  lastSyncAt?: string;

  /** The inbound half — see {@link GetLeadInbound}. Absent until issued. */
  inbound?: GetLeadInbound;
}

/**
 * What lets GetLead call us back.
 *
 * GetLead has no webhook subscription API; what it has is a workflow action,
 * "Send webhook notification", that an admin configures by hand inside GetLead
 * with a URL and an optional secret. So both halves of this are issued here and
 * copied across by a person.
 *
 * The two secrets answer different questions, which is why there are two. The
 * **token** in the URL says *which org this is*; the **secret** proves the
 * delivery really came from GetLead. A URL that leaks on its own is then worth
 * nothing, which would not be true if one value did both jobs.
 */
export interface GetLeadInbound {
  /**
   * The token that appears in the webhook URL.
   *
   * Stored so the settings screen can show the whole URL whenever it is asked
   * for. A one-time reveal would be the stronger position, but the URL has to be
   * pasted into GetLead by hand and re-read whenever someone rebuilds the
   * workflow, and a value nobody can look up gets replaced instead — which
   * breaks the workflow that was working. It sits beside `apiKey` and `secret`,
   * which are already readable to the same people, so it adds no new audience.
   */
  token: string;
  /**
   * sha256 of the token, hex — what a delivery is looked up by.
   *
   * Deliberately not bcrypt, which `apiAccessToken` uses for the org API key:
   * that key is verified against a row already located by `orgId`, so a salted
   * hash costs one comparison. Here the token *is* the lookup key, and a salted
   * hash would mean bcrypt-comparing every org's token on every delivery.
   *
   * Kept even though `token` is stored, so the token never appears in a query —
   * a `where` clause ends up in slow-query and debug logs; a hash there is inert.
   */
  tokenHash: string;
  /**
   * The HMAC secret, in plaintext, because verifying a signature requires the
   * secret itself — there is no hashed form that would work. It sits beside
   * `apiKey`, which is already stored the same way, so this adds no new class of
   * exposure to the credential blob.
   */
  secret: string;
  createdAt: string;
  /** Set by the receiver. Absent means GetLead has never called — the one
   *  signal that the workflow was never configured on their side. */
  lastReceivedAt?: string;
  /**
   * The last delivery's fields and values, minus the personal ones.
   *
   * Kept because a timestamp only says *that* something arrived. Phase B needs
   * to know what GetLead actually sends — whether a placeholder rendered, and
   * whether a status is a ULID or a display name — and reading it off the
   * settings screen beats asking someone to find a line in a server log.
   */
  lastEvent?: string;
  /**
   * The last delivery that was refused, and why.
   *
   * Recorded because a rejection is otherwise invisible: GetLead's workflow log
   * shows a 401 with no reason, and ours shows a line in a server log nobody is
   * watching. A webhook that is configured correctly but signed under a header
   * name we do not accept looks exactly like a webhook nobody set up.
   */
  lastRejectedAt?: string;
  /** `missing_signature` or `bad_signature`, with the header names seen. */
  lastRejectReason?: string;
}

/** An Integration row known to be the GetLead one. */
export type GetLeadIntegration = Omit<Integration, "credential"> & {
  credential: GetLeadCredential;
};

/**
 * Reads `Integration.credential` as a GetLeadCredential. Prisma types the column
 * as `Json`, so this is the one place the untyped blob is interpreted.
 */
export function getGetLeadCredential(integration: { credential: unknown }): GetLeadCredential {
  return integration.credential as GetLeadCredential;
}

/** The body a lead create or update sends. Every field bar the phones is optional. */
export interface GetLeadWritePayload {
  name?: string;
  email?: string;
  phone_numbers?: string[];
  source_id?: string;
  status_id?: string;
  purpose_ids?: string[];
  assigned_to_id?: string;
  notes?: string;
  custom_fields?: Record<string, unknown>;
}

/** `PATCH /leads/by-identifier` locates the lead by one of these instead of an id. */
export interface GetLeadIdentifier {
  phone_number?: string;
  email?: string;
}

// ---------------------------------------------------------------------------
// Errors
//
// GetLead answers with three different shapes, only one of which is documented.
// All three were observed against the live API on 2026-09-03:
//
//   field validation (422)  {"message": "...", "errors": {"phone_numbers": ["..."]}}
//   business rule   (422)   {"error": {"code": "...", "message": "...", "context": []}}
//   not found       (404)   {"message": "Lead not found with the provided identifier"}
//
// `context` came back as `[]` rather than an object, so it is typed loosely.
// ---------------------------------------------------------------------------

/** The documented business-rule body. */
export interface GetLeadRuleErrorBody {
  error: { code: string; message: string; context?: unknown };
}

/** Laravel's field-validation body, which the docs do not mention. */
export interface GetLeadValidationErrorBody {
  message: string;
  errors: Record<string, string[]>;
}

/** A normalised view of a failure, whichever shape it arrived in. */
export interface GetLeadError {
  status?: number;
  /** The business-rule code, when there was one. */
  code?: string;
  message: string;
  /** Field name -> messages, for validation failures. */
  fieldErrors?: Record<string, string[]>;
}

function responseBody(error: unknown): unknown {
  return (error as { response?: { data?: unknown } } | null | undefined)?.response?.data;
}

/**
 * Flattens any GetLead failure into one shape.
 *
 * Written against all three observed bodies rather than the documented one:
 * reading `error.code` alone silently loses every field-validation message,
 * which is the most common failure a push will hit.
 */
export function parseGetLeadError(error: unknown): GetLeadError {
  const status = axios.isAxiosError(error) ? error.response?.status : undefined;
  const body = responseBody(error);

  if (body && typeof body === "object") {
    const rule = body as Partial<GetLeadRuleErrorBody>;
    if (rule.error && typeof rule.error === "object") {
      return {
        status,
        code: rule.error.code,
        message: rule.error.message ?? "GetLead rejected the request",
      };
    }

    const validation = body as Partial<GetLeadValidationErrorBody>;
    if (validation.errors && typeof validation.errors === "object") {
      return {
        status,
        message: validation.message ?? "GetLead rejected the request",
        fieldErrors: validation.errors,
      };
    }

    if (typeof validation.message === "string") {
      return { status, message: validation.message };
    }
  }

  return {
    status,
    message: error instanceof Error ? error.message : "GetLead request failed",
  };
}

/** The lead does not exist — the branch that falls through to a create. */
export function isGetLeadNotFound(error: unknown): boolean {
  return parseGetLeadError(error).status === 404;
}

/**
 * GetLead refusing a status because the configured workflow forbids that move.
 *
 * Worth distinguishing because it is the one failure where retrying *without*
 * `status_id` still lands the rest of the edit.
 */
export function isInvalidStatusTransition(error: unknown): boolean {
  return parseGetLeadError(error).code === "status_transition_must_be_valid";
}

/** Rate limited. `retryAfterSeconds` is absent when GetLead sent no hint. */
export function isRateLimited(error: unknown): boolean {
  return parseGetLeadError(error).status === 429;
}

/**
 * How long to wait before retrying a 429.
 *
 * Prefers the documented `retry_after` body field, falling back to the standard
 * `Retry-After` header, then to a minute — the window the limit is stated in.
 */
export function retryAfterSeconds(error: unknown, fallback = 60): number {
  const body = responseBody(error) as { retry_after?: unknown } | undefined;
  if (typeof body?.retry_after === "number" && body.retry_after > 0) return body.retry_after;

  const header = axios.isAxiosError(error) ? error.response?.headers?.["retry-after"] : undefined;
  const parsed = Number(header);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

/** GetLead's own view of the caller's remaining minute budget. */
export interface GetLeadRateLimit {
  /** The plan's ceiling. Varies per business — never assume 100. */
  limit?: number;
  remaining?: number;
}

function headerNumber(headers: unknown, name: string): number | undefined {
  const raw = (headers as Record<string, unknown> | undefined)?.[name];
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : undefined;
}

/**
 * Reads the rate-limit headers GetLead sends on every response.
 *
 * Undocumented, but present on success and failure alike. Reading them beats
 * counting our own calls for three reasons, all confirmed against the live API:
 * the ceiling is a per-plan value rather than a fixed 100, the budget is shared
 * across every endpoint, and failed requests still spend from it. A counter of
 * our own would have to guess at all three, and would still miss spend by
 * anything else using the same key.
 */
export function readRateLimit(headers: unknown): GetLeadRateLimit {
  return {
    limit: headerNumber(headers, "x-ratelimit-limit"),
    remaining: headerNumber(headers, "x-ratelimit-remaining"),
  };
}
