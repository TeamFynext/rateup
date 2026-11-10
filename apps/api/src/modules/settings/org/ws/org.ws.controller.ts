import { buildActor, isUserBlocked, loadActor } from "../../../../authz/actor.js";
import { roleKeyToLegacy } from "../../../../authz/roles.js";
import { FastifyReply, FastifyRequest } from "fastify";
import crypto from "node:crypto";
import { orgWsMessage } from "../../../../types/global.js";
import { log } from "../../../../utils/logger.js";
import { recordApiUsage } from "../../apiKeys/apiUsage.js";
import { currentContactId } from "../../../contacts/merge/currentContact.js";
import baseRedis from "../../../../utils/redisConnection.js";
import { userStatusQueue } from "../../../../workers/bullmq/queues/index.js";
import { WebSocket } from "@fastify/websocket";
import { getSessionWithoutRequestResponse } from "supertokens-node/recipe/session/index.js";
import { authenticateWidgetKey } from "../../apiKeys/apiKey.auth.js";
import { scopesAllowWidget, WIDGET_KEY_REFUSED } from "../../../../authz/apiKeyFeatures.js";
import { Role } from "../../../../generated/prisma/client.js";
// Constants for delays
const ONLINE_DEBOUNCE_MS = 2000;
const OFFLINE_DELAY_MS = 15000;
const JOB_KEY_EXPIRE_SEC = 120;
/**
 * How often each socket is pinged. Proxies in front of the API (dev tunnels, load balancers)
 * close a socket that carries no traffic for a minute or two, and a quiet inbox sends none.
 * The ping keeps it alive; a socket that has not answered the previous ping is dead and
 * is terminated, so it does not linger in activeConnections.
 */
const HEARTBEAT_MS = 30_000;

const subscriber = baseRedis.duplicate();
const publisher = baseRedis.duplicate();

export const WS_CHANNEL = "ws:messages";

// Store active connections in memory for direct socket access
/**
 * A live browser socket, tagged with the *client surface* that opened it so a broadcast can
 * be aimed at one of them. The two surfaces are `main` (the dashboard app) and `fab` (the
 * embedded support widget); the client declares which it is with `?role=`, and the inbox
 * broadcasts pick one with `sendViaWstoOrgHandler`'s `roleFilter`.
 *
 * This is deliberately *not* the user's org role. Tagging it with the session role
 * (`SUPER_ADMIN`, `AGENT`, …) meant no dashboard socket ever equalled the `"main"` filter,
 * so every inbox event was dropped before it reached the browser.
 */
type RoleTaggedSocket = WebSocket & {
  role?: string;
  /**
   * Set only on widget sockets. A `fab` broadcast goes to the whole org, so without this
   * every visitor's widget on the site would be handed every other visitor's conversation.
   * Present means "deliver only this contact's messages"; absent (the dashboard) means all.
   */
  contactId?: string;
  /** The signed-in user; a broadcast naming `userIds` reaches only their sockets. */
  userId?: string;
  /**
   * Widget sockets only: the contact id the widget asked with. It differs from `contactId`
   * when that contact was merged since; events are labelled with this one, which is the id
   * the widget compares them against.
   */
  widgetContactId?: string;
};

const activeConnections = new Map<string, Map<string, RoleTaggedSocket>>();

/**
 * The surfaces a socket may claim to be. Anything else — notably an org role like
 * `SUPER_ADMIN` — is not a surface, so it collapses to `main` rather than being trusted:
 * the tag is client-declared, and must never be able to name a privilege level.
 */
const WS_CLIENT_SURFACES = new Set(["main", "fab"]);

// Helper to generate job key
function getJobKey(userId: string, orgId: string) {
  return `user-status-job:${userId}:${orgId}`;
}

// Debounced online update
async function scheduleOnlineStatus(userId: string, orgId: string) {
  if (!userId || !orgId) return;
  const jobKey = getJobKey(userId, orgId);
  try {
    // Remove any pending offline job
    const offlineJobId = await baseRedis.get(jobKey);
    if (offlineJobId) {
      await userStatusQueue.remove(offlineJobId);
      await baseRedis.del(jobKey);
    }
    // Schedule online status update (debounced)
    await userStatusQueue.add(
      "set-online",
      { userId, orgId },
      { delay: ONLINE_DEBOUNCE_MS, removeOnComplete: true },
    );
  } catch (err) {
    log.error("Error scheduling online status: %s", err);
  }
}

// Delayed offline update
async function scheduleOfflineStatus(userId: string, orgId: string) {
  if (!userId || !orgId) return;
  const jobKey = getJobKey(userId, orgId);
  try {
    // Schedule offline status update after delay
    const job = await userStatusQueue.add(
      "set-offline",
      { userId, orgId },
      { delay: OFFLINE_DELAY_MS, removeOnComplete: true },
    );
    if (job.id) {
      await baseRedis.set(jobKey, job.id, "EX", JOB_KEY_EXPIRE_SEC);
    }
  } catch (err) {
    log.error("Error scheduling offline status: %s", err);
  }
}

subscriber.on("message", (channel, message) => {
  if (channel !== WS_CHANNEL) return;
  try {
    const parsedMessage = JSON.parse(message);
    const { orgId, data, roleFilter, userIds } = parsedMessage;
    const connections = activeConnections.get(orgId);
    if (!connections) return;
    const forContact = data?.inbox?.contact?.id;
    const forUsers: Set<string> | null = Array.isArray(userIds) ? new Set(userIds) : null;
    for (const client of connections.values()) {
      if (client.readyState !== 1) continue;
      if (roleFilter && client.role !== roleFilter) continue;
      if (forUsers && (!client.userId || !forUsers.has(client.userId))) continue;
      // A socket that named a contact hears about that contact and nothing else — and a
      // widget only about its webchat thread: a contact merged with a WhatsApp or Instagram
      // customer must not stream those conversations to a website visitor.
      if (client.contactId && client.contactId !== forContact) continue;
      if (client.contactId && data?.inbox?.message?.sourcePlatform !== "WEBCHAT") continue;
      if (client.contactId) {
        // A widget runs on a public page: it gets the message and nothing of the contact
        // record (phone, email, notes — after a merge, a WhatsApp customer's), and the event
        // carries the contact id the widget itself knows.
        client.send(
          JSON.stringify({
            type: data.type,
            inbox: {
              contact: { id: client.widgetContactId ?? client.contactId },
              message: data.inbox.message,
            },
          }),
        );
        continue;
      }
      client.send(JSON.stringify(data));
    }
  } catch (err) {
    log.error("Error handling WS message: %s", err);
  }
});

subscriber.subscribe(WS_CHANNEL);

export async function handleWebSocketConnection(
  connection: RoleTaggedSocket,
  request: FastifyRequest<{
    Params: { afterAuthId: string };
    Querystring: { role?: string; accessToken?: string; contactId?: string };
  }>,
) {
  const browserId = request.params.afterAuthId;
  const orgId = request.user?.orgId;
  // The client surface, not the session role — see RoleTaggedSocket. The dashboard sends
  // no `role` at all, so it has to default to `main`, which is what the inbox broadcasts
  // target; the support widget sends `?role=fab`.
  const requestedSurface = request.query?.role;
  const userId = request.userId;
  // Anything that is not a signed-in user (the widget's public key) is a `fab` socket bound to
  // one contact, whatever it asks for: `main` hears the whole org's inbox.
  const isUserPrincipal = !request.principal || request.principal.kind === "user";
  const requestedContactId = request.query?.contactId;
  if (!isUserPrincipal && !requestedContactId) {
    connection.send(JSON.stringify({ error: "A contactId is required" }));
    connection.close();
    return;
  }
  const role = !isUserPrincipal
    ? "fab"
    : requestedSurface && WS_CLIENT_SURFACES.has(requestedSurface)
      ? requestedSurface
      : "main";

  if (!orgId || !browserId) {
    connection.send(JSON.stringify({ error: "Missing orgId or browserId" }));
    connection.close();
    return;
  }

  if (!activeConnections.has(orgId)) {
    activeConnections.set(orgId, new Map<string, RoleTaggedSocket>());
  }

  const socketKey = crypto.randomUUID();

  // Store role alongside connection
  connection.role = role;
  if (role === "main" && userId) connection.userId = userId;
  // Widget sockets name the conversation they are showing; see RoleTaggedSocket. The id the
  // widget kept may belong to a contact merged since, so it is followed to the current one.
  if (role === "fab" && requestedContactId) {
    connection.widgetContactId = requestedContactId;
    connection.contactId =
      (await currentContactId(orgId, requestedContactId).catch(() => null)) ?? requestedContactId;
  }
  activeConnections.get(orgId)!.set(socketKey, connection);

  connection.on("message", (msg) => {
    log.info(`[${orgId} - ${role}] Received message: %s`, msg.toString());
  });
  // Debounced online status update
  await scheduleOnlineStatus(userId, orgId);

  let alive = true;
  connection.on("pong", () => {
    alive = true;
  });
  const heartbeat = setInterval(() => {
    if (!alive) {
      connection.terminate();
      return;
    }
    alive = false;
    connection.ping();
  }, HEARTBEAT_MS);

  connection.on("close", async () => {
    clearInterval(heartbeat);
    try {
      activeConnections.get(orgId)?.delete(socketKey);
      // Schedule offline status update after 1 minute
      await scheduleOfflineStatus(userId, orgId);
    } catch (err) {
      log.error("Error cleaning up connection: %s", err);
    }
  });
}

export async function sendViaWstoOrgHandler(
  orgId: string,
  message: orgWsMessage,
  roleFilter?: string,
  /** Only these users' sockets. Omitted means every socket the filter admits. */
  userIds?: string[],
) {
  try {
    await publisher.publish(
      WS_CHANNEL,
      JSON.stringify({ orgId, data: message, roleFilter, ...(userIds && { userIds }) }),
    );
  } catch (err) {
    log.error("Error publishing message to org %s: %s", orgId, err);
  }
}

export async function orgWsAuthCheckHandler(_request: FastifyRequest, reply: FastifyReply) {
  reply.send({ afterAuthId: crypto.randomBytes(16).toString("hex") });
}

/**
 * Auth for the embedded support widget's socket. `verifyWidgetTokenHook` reads the
 * Authorization header, which a browser `new WebSocket(...)` cannot set — there is no API for
 * it — so the widget's key arrives as a query parameter instead, and names the org itself. The
 * token is public by design: it ships inside the widget bundle on the customer's page, so it
 * proves only which org the socket belongs to, never who the visitor is, and only a key that
 * is full access or carries the `widget` feature is taken. Everything that
 * follows treats it that way; `contactId` scoping is what keeps one visitor out of another's
 * conversation.
 */
export const checkWidgetToken = async (
  request: FastifyRequest<{ Querystring: { accessToken?: string } }>,
  reply: FastifyReply,
) => {
  const { accessToken } = request.query ?? {};

  let orgId: string;
  let keyId: string;
  try {
    const grant = await authenticateWidgetKey(accessToken);
    if (!grant) {
      reply.code(401).send({ message: "Not authorized" });
      return;
    }
    orgId = grant.orgId;
    keyId = grant.keyId;
    // Only a full-access key or one with the Webchat widget feature: the token is public, so
    // a key limited to other features (contacts, campaigns…) must not be usable from a page.
    if (!scopesAllowWidget(grant.scopes)) {
      reply.code(403).send({ message: "Forbidden", error: WIDGET_KEY_REFUSED });
      return;
    }
  } catch (err) {
    log.error({ err }, "Could not verify the widget socket token");
    reply.code(401).send({ message: "Not authorized" });
    return;
  }

  request.user = { orgId, role: Role.SUPER_ADMIN };
  request.principal = { kind: "widget", orgId };
  request.actor = buildActor(request.principal);
  // A socket upgrade never reaches an onResponse hook, so the widget's live connection is
  // counted here, once per connection, against the key that opened it.
  recordApiUsage({
    orgId,
    keyId,
    method: "GET",
    route: "/org/ws/widget",
    status: 101,
    latencyMs: Math.round(reply.elapsedTime),
    createdAt: new Date(),
  });
};

export const checkMobileId = async (
  request: FastifyRequest<{ Querystring: { accessToken?: string } }>,
  reply: FastifyReply,
) => {
  const header = request.headers.authorization;
  const bearer = header?.startsWith("Bearer ") ? header.slice(7).trim() : undefined;
  const accessToken = bearer || request.query.accessToken;

  if (!accessToken) {
    log.error("No accessToken found in header or query\n%o", request.headers);
    reply.code(401).send({ message: "Not authorized" });
    return;
  }
  if (!bearer) {
    log.warn("Mobile socket authenticated with a query-string accessToken (deprecated)");
  }

  let session;
  try {
    // An invalid or absent token made this reject, and the rejection escaped
    // the preHandler instead of answering 401.
    session = await getSessionWithoutRequestResponse(accessToken);
  } catch (err) {
    log.error({ err }, "Could not resolve mobile socket session");
    reply.code(401).send({ message: "Not authorized" });
    return;
  }

  const userId = session?.getUserId();
  if (!userId) {
    log.error("No userId found in session\n%o", request.headers);
    // This branch used to send the 401 and then carry on to read the payload
    // and set request.user on a request it had already refused.
    reply.code(401).send({ message: "Not authorized" });
    return;
  }
  if (await isUserBlocked(userId)) {
    reply.code(401).send({ message: "Not authorized" });
    return;
  }
  request.userId = userId;
  const { role, orgId, email } = session.getAccessTokenPayload();
  const actor = orgId ? await loadActor(userId, orgId) : null;
  if (actor) request.actor = actor;
  request.user = { userId, role: actor ? roleKeyToLegacy(actor.roleKey!) : role, orgId, email };
};
