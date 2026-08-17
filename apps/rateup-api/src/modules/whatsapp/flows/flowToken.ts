import crypto from "node:crypto";
import { log } from "../../../utils/logger.js";

/**
 * The `flow_token` is the only thing Meta echoes back to us on both the
 * `data_exchange` webhook and the final `nfm_reply` message, so it is where the
 * context of a flow run belongs: which survey/team mapping the answers are for,
 * which org, and who is answering.
 *
 * Historically the token was just the phone number, which meant the context had
 * to be recovered by looking up a session row keyed by `(phone, orgId)` — one
 * live run per person per org, and a DB write on every send. A signed token
 * carries the same facts inside the token itself.
 *
 * Format: `v1.<base64url(payload)>.<base64url(hmac-sha256)>`. The payload is
 * signed, not encrypted: it is visible to anyone holding the token (which is the
 * recipient and Meta), so it must never carry anything secret. The signature is
 * what stops a caller from swapping in another org's `surveyTeamMapId`.
 *
 * Tokens do not expire. A respondent may open a survey days after it arrives and
 * their answers are still worth having, and WhatsApp's own expiry on interactive
 * flow messages already bounds how long one can be opened at all. `issuedAt` is
 * carried for diagnostics, not enforcement. Re-submission is prevented by the
 * completion marker in flowState.ts rather than by a time limit.
 */

const TOKEN_VERSION = "v1";

export interface FlowTokenPayload {
  /** SurveyTeamMap the answers belong to. */
  s: string;
  /** Org id. */
  o: string;
  /** Respondent's phone. */
  p: string;
  /** Response language. */
  l?: string;
  /** Campaign participant, when the flow was sent by a campaign. */
  c?: string;
  /** Campaign drip stage participant. */
  d?: string;
  /** Free-text tag carried onto the response. */
  t?: string;
  /** Issued-at, epoch ms. */
  i: number;
}

export interface FlowContext {
  surveyTeamMapId: string;
  orgId: string;
  phone: string;
  language: string;
  campaignParticipantId?: string;
  campaignParticipantDripStageId?: string;
  tag?: string;
  issuedAt: Date;
}

function secret() {
  const value = process.env.FLOW_TOKEN_SECRET;
  if (!value) {
    throw new Error("FLOW_TOKEN_SECRET environment variable must be set");
  }
  return value;
}

function sign(body: string) {
  return crypto.createHmac("sha256", secret()).update(body).digest("base64url");
}

export function signFlowToken(context: {
  surveyTeamMapId: string;
  orgId: string;
  phone: string;
  language?: string | null;
  campaignParticipantId?: string | null;
  campaignParticipantDripStageId?: string | null;
  tag?: string | null;
  issuedAt?: Date;
}): string {
  const payload: FlowTokenPayload = {
    s: context.surveyTeamMapId,
    o: context.orgId,
    p: context.phone,
    i: (context.issuedAt ?? new Date()).getTime(),
  };
  if (context.language) payload.l = context.language;
  if (context.campaignParticipantId) payload.c = context.campaignParticipantId;
  if (context.campaignParticipantDripStageId) payload.d = context.campaignParticipantDripStageId;
  if (context.tag) payload.t = context.tag;

  const body = `${TOKEN_VERSION}.${Buffer.from(JSON.stringify(payload)).toString("base64url")}`;
  return `${body}.${sign(body)}`;
}

/**
 * Verifies and decodes a token. Returns null for anything that is not a valid
 * token this server signed — a tampered or truncated token, or a bare phone
 * number, which is what a sender that was given no run context puts in
 * `flow_token`. A run that cannot be identified cannot be attributed, so
 * callers drop the request rather than guess.
 */
export function verifyFlowToken(token: string | undefined | null): FlowContext | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3 || parts[0] !== TOKEN_VERSION) return null;

  const body = `${parts[0]}.${parts[1]}`;
  const expected = sign(body);
  const given = parts[2]!;
  // Both are base64url of a 32-byte digest, so the lengths always match here;
  // the check keeps timingSafeEqual from throwing on a malformed token.
  if (given.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(given), Buffer.from(expected))) return null;

  let payload: FlowTokenPayload;
  try {
    payload = JSON.parse(Buffer.from(parts[1]!, "base64url").toString("utf8"));
  } catch (e) {
    log.warn({ err: e }, "Flow token payload is not valid JSON");
    return null;
  }
  if (!payload?.s || !payload?.o || !payload?.p || !payload?.i) return null;

  return {
    surveyTeamMapId: payload.s,
    orgId: payload.o,
    phone: payload.p,
    language: payload.l ?? "",
    campaignParticipantId: payload.c,
    campaignParticipantDripStageId: payload.d,
    tag: payload.t,
    issuedAt: new Date(payload.i),
  };
}
