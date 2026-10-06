import crypto from "node:crypto";

import { appConfig } from "../../../../config.js";
import prisma from "../../../../utils/prisma.js";
import { IntegratedApps } from "../../../../types/enums.js";
import { generateApiKey } from "../../../apiAccessToken/apiAccessToken.service.js";
import { mergeGetLeadCredential } from "./getlead.credential.js";
import { getGetLeadCredential, type GetLeadInbound } from "./getlead.types.js";

/**
 * The inbound half of the GetLead integration: the URL and secret an admin
 * pastes into a GetLead workflow's "Send webhook notification" action.
 *
 * Kept apart from `getlead.connect.ts` and `getlead.push.ts` because none of it
 * touches the GetLead API — this is credential issuing and request
 * authentication.
 */

/** Where the receiver is mounted; see `integration.public.route.ts`. */
const WEBHOOK_PATH = "/api/public/integrations/getlead/hooks";

/**
 * Header names to look for a signature under.
 *
 * GetLead's documentation says only "optional secret for HMAC signature
 * verification" — it names neither the header nor the encoding. Rather than
 * guess one and reject every real delivery, the candidates are tried in turn
 * and the first present one is used. Narrow this to the real header once a
 * delivery has been seen; `logGetLeadDeliveryShape` is what reveals it.
 */
const SIGNATURE_HEADERS = [
  "x-getlead-signature",
  "x-signature",
  "x-webhook-signature",
  "x-hub-signature-256",
  "signature",
];

/** sha256 hex. The token is high-entropy random, so no stretching is wanted. */
export function hashGetLeadToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function buildGetLeadWebhookUrl(token: string) {
  return `${appConfig.backendUrl.replace(/\/+$/, "")}${WEBHOOK_PATH}/${token}`;
}

/**
 * Mints a token and secret. Pure — nothing is stored here.
 *
 * Separate from {@link issueGetLeadWebhook} so `connectGetLead` can fold a fresh
 * one into the same credential write it already makes, rather than issuing in a
 * second write that could half-succeed.
 *
 * Reuses `generateApiKey` so every credential Rateup hands out is minted the
 * same way — 32 bytes from `crypto.randomBytes`, base64url. Only its `key` is
 * used; the bcrypt hash it also returns suits a lookup keyed on `orgId`, which
 * is not the shape of this problem (see {@link GetLeadInbound.tokenHash}).
 */
export async function createGetLeadInbound(): Promise<GetLeadInbound> {
  const [{ key: token }, { key: secret }] = await Promise.all([generateApiKey(), generateApiKey()]);

  return {
    token,
    tokenHash: hashGetLeadToken(token),
    secret,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Issues a fresh token and secret, replacing any that exist.
 *
 * Replacing is not free: the URL changes, so the workflow inside GetLead stops
 * delivering until someone pastes the new one in. The UI says so before asking.
 */
export async function issueGetLeadWebhook(orgId: string) {
  const inbound = await createGetLeadInbound();

  await mergeGetLeadCredential(orgId, { inbound });

  return describeGetLeadInbound(inbound);
}

/** What the settings screen shows: the whole URL, the secret, and the last call. */
export function describeGetLeadInbound(inbound: GetLeadInbound) {
  return {
    url: buildGetLeadWebhookUrl(inbound.token),
    secret: inbound.secret,
    createdAt: inbound.createdAt,
    lastReceivedAt: inbound.lastReceivedAt ?? null,
    lastEvent: inbound.lastEvent ?? null,
    lastRejectedAt: inbound.lastRejectedAt ?? null,
    lastRejectReason: inbound.lastRejectReason ?? null,
  };
}

/**
 * Finds the org a delivery belongs to, by the token in its URL.
 *
 * Matched on the hash, so the token is never stored and a database read does not
 * hand over working webhook URLs. `Integration` holds one row per org per
 * provider, so the unindexed JSON path filter is a small scan; it earns an
 * expression index only if that stops being true.
 */
export async function resolveGetLeadWebhookOrg(token: string) {
  if (!token) return null;

  const integration = await prisma.integration.findFirst({
    where: {
      name: IntegratedApps.getlead,
      active: true,
      credential: { path: ["inbound", "tokenHash"], equals: hashGetLeadToken(token) },
    },
  });
  if (!integration?.orgId) return null;

  const credential = getGetLeadCredential(integration);
  if (!credential.inbound?.secret) return null;

  return { integration, orgId: integration.orgId, inbound: credential.inbound };
}

/**
 * Whether `rawBody` carries a signature made with `secret`.
 *
 * Both hex and base64 are accepted because GetLead does not say which it sends,
 * and a signature that is right but encoded differently is not a failure worth
 * rejecting a lead status over. Compared with `timingSafeEqual` after a length
 * check, which is what keeps that call from throwing.
 */
export function verifyGetLeadSignature(
  rawBody: string,
  secret: string,
  headers: Record<string, unknown>,
) {
  const header = SIGNATURE_HEADERS.map((name) => headers[name]).find(
    (value): value is string => typeof value === "string" && value.length > 0,
  );
  if (!header) return { ok: false as const, reason: "missing_signature" };

  // `sha256=<digest>` is common enough to be worth stripping rather than failing
  // on. Anchored to a known algorithm prefix rather than splitting on "=": a
  // base64 digest ends in "=" padding, and a looser split eats it.
  const presented = header.replace(/^sha(?:1|256|512)=/i, "");
  const digest = (encoding: "hex" | "base64") =>
    crypto.createHmac("sha256", secret).update(rawBody).digest(encoding);
  const candidates = [digest("hex"), digest("base64")];

  const matched = candidates.some((expected) => {
    const a = Buffer.from(expected);
    const b = Buffer.from(presented);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  });

  return matched ? { ok: true as const } : { ok: false as const, reason: "bad_signature" };
}

/**
 * Records a delivery that was refused, so the settings screen can say so.
 *
 * Throttled to one write a minute: a rejection is a DB write driven by an
 * inbound request, and without a bound a caller holding the token could turn a
 * bad signature into write amplification. One a minute is plenty to diagnose a
 * misconfiguration, which is what this is for.
 */
export async function markGetLeadDeliveryRejected(
  orgId: string,
  inbound: GetLeadInbound,
  reason: string,
) {
  const last = inbound.lastRejectedAt ? Date.parse(inbound.lastRejectedAt) : 0;
  if (Date.now() - last < 60_000) return;

  try {
    await mergeGetLeadCredential(orgId, {
      inbound: {
        ...inbound,
        lastRejectedAt: new Date().toISOString(),
        lastRejectReason: reason.slice(0, 500),
      },
    });
  } catch (error) {
    console.error("Failed to record a rejected GetLead delivery", error);
  }
}

/**
 * Records that a delivery arrived, so the settings screen can say whether the
 * workflow was ever wired up on the GetLead side.
 *
 * Best-effort: a delivery that was verified and understood must not be failed
 * because a bookkeeping write did not land.
 */
export async function markGetLeadDeliveryReceived(
  orgId: string,
  inbound: GetLeadInbound,
  lastEvent?: string,
) {
  try {
    await mergeGetLeadCredential(orgId, {
      inbound: {
        ...inbound,
        lastReceivedAt: new Date().toISOString(),
        // Bounded: this rides in the credential blob, which is read on every
        // push, and a runaway payload should not make that read expensive.
        ...(lastEvent && { lastEvent: lastEvent.slice(0, 1000) }),
      },
    });
  } catch (error) {
    console.error("Failed to record a GetLead delivery timestamp", error);
  }
}
