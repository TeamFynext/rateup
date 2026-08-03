import { FastifyReply, FastifyRequest } from "fastify";
import crypto from "node:crypto";
import { orgWsMessage } from "../../../types/global.js";
import { log } from "../../../utils/logger.js";
import baseRedis, { userStatusQueue } from "../../../utils/redisConnection.js";
import { WebSocket } from "@fastify/websocket";
import { getSessionWithoutRequestResponse } from "supertokens-node/recipe/session/index.js";
// Constants for delays
const ONLINE_DEBOUNCE_MS = 2000;
const OFFLINE_DELAY_MS = 15000;
const JOB_KEY_EXPIRE_SEC = 120;

const subscriber = baseRedis.duplicate();
const publisher = baseRedis.duplicate();

export const WS_CHANNEL = "ws:messages";

// Store active connections in memory for direct socket access
/**
 * A live browser socket, tagged with the role of the user who opened it so broadcasts can
 * be filtered to (say) admins only.
 */
type RoleTaggedSocket = WebSocket & { role?: string };

const activeConnections = new Map<string, Map<string, RoleTaggedSocket>>();

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
    const { orgId, data, roleFilter } = parsedMessage;
    const connections = activeConnections.get(orgId);
    if (!connections) return;
    for (const client of connections.values()) {
      if (client.readyState === 1 && (!roleFilter || client.role === roleFilter)) {
        client.send(JSON.stringify(data));
      }
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
    Querystring: { role?: string; accessToken?: string };
  }>,
) {
  const browserId = request.params.afterAuthId;
  const orgId = request.user?.orgId;
  const role = request.user?.role || "main";
  const userId = request.userId;

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
  activeConnections.get(orgId)!.set(socketKey, connection);

  connection.on("message", (msg) => {
    log.info(`[${orgId} - ${role}] Received message: %s`, msg.toString());
  });
  // Debounced online status update
  await scheduleOnlineStatus(userId, orgId);

  connection.on("close", async () => {
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
) {
  try {
    await publisher.publish(WS_CHANNEL, JSON.stringify({ orgId, data: message, roleFilter }));
  } catch (err) {
    log.error("Error publishing message to org %s: %s", orgId, err);
  }
}

export async function orgWsAuthCheckHandler(_request: FastifyRequest, reply: FastifyReply) {
  reply.send({ afterAuthId: crypto.randomBytes(16).toString("hex") });
}

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
  request.userId = userId;
  const { role, orgId, email } = session.getAccessTokenPayload();
  const user = { userId, role, orgId, email };
  request.user = user;
};
