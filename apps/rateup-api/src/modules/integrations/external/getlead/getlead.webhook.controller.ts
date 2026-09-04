import { FastifyReply, FastifyRequest } from "fastify";

import { recordAuditEvent } from "../../../../utils/auditLog.js";
import { log } from "../../../../utils/logger.js";
import { applyGetLeadInbound, unwrapGetLeadDelivery } from "./getlead.inbound.js";
import { getGetLeadIntegration } from "./getlead.service.js";
import { getGetLeadCredential } from "./getlead.types.js";
import {
  describeGetLeadInbound,
  markGetLeadDeliveryRejected,
  issueGetLeadWebhook,
  markGetLeadDeliveryReceived,
  resolveGetLeadWebhookOrg,
  verifyGetLeadSignature,
} from "./getlead.webhook.js";

/**
 * The inbound webhook: authenticate a delivery, apply it, and record what came
 * of it.
 *
 * Built in two passes on purpose. The first only authenticated and logged,
 * because GetLead documents neither its signature header nor the placeholder
 * names its templates expose — so the write path would have rested on two
 * guesses. A real delivery settled both (see §9.10 of the plan), and this is
 * the write path built against what actually arrives.
 */

/**
 * The inbound half, as the settings screen shows it: the whole URL and secret.
 *
 * Both are readable rather than revealed once, because both have to be pasted
 * into GetLead by hand and re-read whenever someone rebuilds the workflow. The
 * audience is the same one that can already read and replace the API key on
 * that screen, so this widens nothing.
 *
 * `lastReceivedAt` is the only honest signal that the workflow was actually
 * created inside GetLead — nothing in their API can be asked.
 */
export async function getGetLeadWebhookHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { orgId } = request.user;
    const integration = await getGetLeadIntegration(orgId);
    if (!integration) {
      return reply.code(404).send({ error: "GetLead is not connected for this organisation." });
    }

    const inbound = getGetLeadCredential(integration).inbound;
    // `token` is checked rather than `inbound` itself: an org connected before
    // the inbound half existed has none, and one connected before the token was
    // stored has an `inbound` that cannot produce a URL. Both mean the same
    // thing here — there is nothing to show, and `POST /webhook` fixes it.
    if (!inbound?.token) {
      return reply.code(200).send({ configured: false });
    }

    return reply.code(200).send({ configured: true, ...describeGetLeadInbound(inbound) });
  } catch (error) {
    log.error("Error reading the GetLead webhook settings: %s", error);
    return reply.code(500).send({ error: "Something went wrong" });
  }
}

/**
 * Issues a webhook URL and secret, replacing any already issued.
 *
 * Connecting already seeds a pair, so this is the rotation path — and rotating
 * stops the existing GetLead workflow from delivering until someone pastes the
 * new URL in. Audited as an event without its body, the same way connecting is.
 */
export async function issueGetLeadWebhookHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { orgId } = request.user;
    const integration = await getGetLeadIntegration(orgId);
    if (!integration) {
      return reply.code(404).send({ error: "Connect GetLead before setting up a webhook." });
    }

    const existed = Boolean(getGetLeadCredential(integration).inbound);
    const issued = await issueGetLeadWebhook(orgId);

    await recordAuditEvent(
      request,
      existed ? "GetLead webhook URL regenerated" : "GetLead webhook URL created",
    );

    return reply.code(200).send(issued);
  } catch (error) {
    log.error("Error issuing a GetLead webhook URL: %s", error);
    return reply.code(500).send({ error: "Something went wrong" });
  }
}

/**
 * Receives a delivery from a GetLead workflow's "Send webhook notification".
 *
 * Public by necessity — GetLead has no way to hold a Rateup session — so the
 * token in the path and the signature over the body are the whole of the
 * authentication. The audit hook runs inside `checkSession`, which this route
 * does not use, so the token in the URL is never written to `AuditLog`.
 *
 * An unsigned delivery is refused rather than trusted. GetLead marks the secret
 * field optional, and "it worked without the secret" is how the secret never
 * gets set on an endpoint that will later move lead status.
 *
 * Failures answer 401/404 with nothing that distinguishes a bad token from an
 * unconfigured org: a receiver that says which one is wrong is an oracle for
 * guessing tokens.
 */
export async function receiveGetLeadWebhookHandler(
  request: FastifyRequest<{ Params: { token: string } }>,
  reply: FastifyReply,
) {
  const resolved = await resolveGetLeadWebhookOrg(request.params.token);
  if (!resolved) {
    log.warn("A GetLead delivery arrived on an unknown or unconfigured webhook token");
    return reply.code(401).send({ error: "Unauthorized" });
  }

  const rawBody = (request as FastifyRequest & { rawBody?: string }).rawBody ?? "";
  const verified = verifyGetLeadSignature(
    rawBody,
    resolved.inbound.secret,
    request.headers as Record<string, unknown>,
  );

  if (!verified.ok) {
    // The header names alone, never their values: one of them may be the
    // signature, and the point is to learn which name GetLead uses.
    const detail = `${verified.reason} (headers: ${Object.keys(request.headers).join(", ")})`;
    log.warn("Rejected a GetLead delivery for org %s: %s", resolved.orgId, detail);
    // Surfaced on the settings screen too. A 401 that only reaches a server log
    // is indistinguishable from a workflow nobody created.
    await markGetLeadDeliveryRejected(resolved.orgId, resolved.inbound, detail);
    return reply.code(401).send({ error: "Unauthorized" });
  }

  // Described from the *unwrapped* payload, not the raw body. A live delivery is
  // an envelope — `{ event, data: {...}, timestamp }` — so the personal fields
  // sit one level down inside `data`, where a top-level key match never sees
  // them: the redaction below was dead on every real delivery, and the whole
  // inner object went to the log and to `lastEvent` verbatim.
  const shape = describePayloadShape(unwrapGetLeadDelivery(request.body));
  log.info("GetLead delivery accepted for org %s. Payload: %s", resolved.orgId, shape);

  // Applied inline rather than queued. A status change is human-paced and the
  // work is a handful of queries, so the round trip stays well inside any
  // sensible webhook timeout — and doing it here keeps the outcome available to
  // record against the delivery, which a fire-and-forget job could not.
  let outcome = "";
  try {
    const applied = await applyGetLeadInbound(resolved.integration, resolved.orgId, request.body);
    outcome = applied.applied
      ? `applied -> stage ${applied.stageId}`
      : `skipped: ${applied.reason}`;
    log.info("GetLead delivery for org %s %s", resolved.orgId, outcome);
  } catch (error) {
    // Never fails the delivery. GetLead's retry policy is undocumented, and a
    // retry cannot fix a mapping or a missing lead — the reason is recorded
    // instead, where the settings screen shows it.
    outcome = `error: ${error instanceof Error ? error.message : "unknown"}`;
    log.error("Failed to apply a GetLead delivery for org %s: %s", resolved.orgId, error);
  }

  await markGetLeadDeliveryReceived(resolved.orgId, resolved.inbound, `${shape} | ${outcome}`);

  // 200 immediately and unconditionally once authenticated: GetLead's retry
  // policy is undocumented, so nothing downstream is worth making it wait on.
  return reply.code(200).send({ received: true });
}

/**
 * A delivery rendered for the log, with the personal fields withheld.
 *
 * Names and types alone were not enough: the two things Phase B has to know are
 * whether `status` arrives as a ULID or as "Contacted", and whether a
 * placeholder rendered at all — an unknown one comes through as the literal
 * `{{lead.whatever}}`. Both are visible only in the value.
 *
 * So values are logged, except for the three fields that carry a real person:
 * their name, email and phone. Those add nothing to what Phase B needs, and an
 * application log is the wrong place for them.
 */
const PERSONAL_FIELDS = new Set(["name", "email", "phone"]);

function describePayloadShape(body: unknown): string {
  if (!body || typeof body !== "object") return `(${typeof body})`;

  return Object.entries(body as Record<string, unknown>)
    .map(([key, value]) => {
      if (PERSONAL_FIELDS.has(key.toLowerCase())) {
        return `${key}=<${value ? "present" : "empty"}>`;
      }
      return `${key}=${JSON.stringify(value)}`;
    })
    .join(", ");
}
