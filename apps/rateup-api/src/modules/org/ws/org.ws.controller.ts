import { FastifyReply, FastifyRequest } from "fastify";
import { connectionManager } from "./org.ws.class";
import { orgWsMessage } from "../../../types/global";
import { log } from "../../../utils/logger";
import baseRedis, { userStatusQueue } from "../../../utils/redisConnection";
import { WebSocket } from "@fastify/websocket";
import { updateUserAvailablityStatus } from "../../user/user.service";
import { UserAvailabilityStatus } from "../../user/user.schema";
import { Job, Worker } from "bullmq";
import prisma from "../../../utils/prisma";
import { UserPresenceMode } from "../../../../generated/prisma/enums";

// Constants for delays
const ONLINE_DEBOUNCE_MS = 2000;
const OFFLINE_DELAY_MS = 15000;
const JOB_KEY_EXPIRE_SEC = 120;

const subscriber = baseRedis.duplicate();
const publisher = baseRedis.duplicate();

export const WS_CHANNEL = "ws:messages";

// Store active connections in memory for direct socket access
const activeConnections = new Map<string, Map<string, WebSocket>>();

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
    await baseRedis.set(jobKey, job.id, "EX", JOB_KEY_EXPIRE_SEC);
  } catch (err) {
    log.error("Error scheduling offline status: %s", err);
  }
}

new Worker(
  "user-availability",
  async (job: Job) => {
    const { userId, orgId } = job.data;
    const user = await prisma.user.findFirst({
      where: { id: userId },
      select: { presenceMode: true },
    });
    if (user?.presenceMode !== UserPresenceMode.automatic) return;
    try {
      if (job.name === "set-online") {
        await updateUserAvailablityStatus(
          userId,
          orgId,
          UserAvailabilityStatus.online,
        );
      } else if (job.name === "set-offline") {
        await updateUserAvailablityStatus(
          userId,
          orgId,
          UserAvailabilityStatus.offline,
        );
      }
    } catch (err) {
      log.error("Error updating user availability: %s", err);
    }
  },
  {
    connection: baseRedis,
    removeOnComplete: { count: 1 },
  },
);

subscriber.on("message", (channel, message) => {
  if (channel !== WS_CHANNEL) return;
  try {
    const parsedMessage = JSON.parse(message);
    const { orgId, data, roleFilter } = parsedMessage;
    const connections = activeConnections.get(orgId);
    if (!connections) return;
    for (const client of connections.values()) {
      if (
        client.readyState === 1 &&
        (!roleFilter || (client as any).role === roleFilter)
      ) {
        client.send(JSON.stringify(data));
      }
    }
  } catch (err) {
    log.error("Error handling WS message: %s", err);
  }
});

subscriber.subscribe(WS_CHANNEL);

export async function handleWebSocketConnection(
  connection: WebSocket,
  request: FastifyRequest<{
    Params: { afterAuthId: string; orgId?: string };
    Querystring: { role?: string };
  }>,
) {
  const browserId = request.params.afterAuthId;
  const orgId = request.user?.orgId || request.params.orgId;
  const role = request.query.role || "main";
  const userId = request.userId;

  if (!orgId || !browserId) {
    connection.send(JSON.stringify({ error: "Missing orgId or browserId" }));
    connection.close();
    return;
  }

  if (!activeConnections.has(orgId)) {
    activeConnections.set(orgId, new Map<string, WebSocket>());
  }

  // Store role alongside connection
  (connection as any).role = role;
  activeConnections.get(orgId)!.set(browserId, connection);

  connection.on("message", (msg) => {
    log.info(`[${orgId} - ${role}] Received message: %s`, msg.toString());
  });
  // Debounced online status update
  await scheduleOnlineStatus(userId, orgId);

  connection.on("close", async () => {
    try {
      activeConnections.get(orgId)?.delete(browserId);
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
    await publisher.publish(
      WS_CHANNEL,
      JSON.stringify({ orgId, data: message, roleFilter }),
    );
  } catch (err) {
    log.error("Error publishing message to org %s: %s", orgId, err);
  }
}

export async function orgWsAuthCheckHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const { orgId } = request.user;
  const afterAuthId = connectionManager.generateAfterAuthIdforOrgId(orgId);
  reply.send({ afterAuthId });
}
