import { FastifyReply, FastifyRequest } from "fastify";
import { connectionManager } from "./org.ws.class";
import { orgWsMessage } from "../../../types/global";
import { log } from "../../../utils/logger";
import baseRedis from "../../../utils/redisConnection";
import { WebSocket } from "@fastify/websocket";

const subscriber = baseRedis.duplicate();
const publisher = baseRedis.duplicate();

const WS_CHANNEL = "ws:messages";

// Store active connections in memory for direct socket access
const activeConnections = new Map<string, Map<string, WebSocket>>();

subscriber.on("message", (channel, message) => {
  if (channel === WS_CHANNEL) {
    const parsedMessage = JSON.parse(message);
    const { orgId, data } = parsedMessage;
    const connections = activeConnections.get(orgId);
    if (!connections) return;
    for (const client of connections?.values()) {
      if (client.readyState === 1) {
        client.send(JSON.stringify(data));
      }
    }
  }
});

subscriber.subscribe(WS_CHANNEL);

export async function handleWebSocketConnection(
  connection: WebSocket,
  request: FastifyRequest<{ Params: { afterAuthId: string; orgId?: string } }>,
) {
  const browserId = request.params.afterAuthId;
  const orgId = request.user?.orgId || request.params.orgId;
  if (!orgId || !browserId) {
    connection.send(JSON.stringify({ error: "Missing orgId or browserId" }));
    connection.close();
    return;
  }

  // Get or create the map for this orgId
  if (!activeConnections.has(orgId)) {
    activeConnections.set(orgId, new Map<string, WebSocket>());
  }

  // Add the connection to the org's map
  activeConnections.get(orgId)!.set(browserId, connection);

  connection.on("message", (msg) => {
    console.log("Received message: ", msg);
  });

  connection.on("close", async () => {
    try {
      activeConnections.get(orgId)?.delete(browserId);
    } catch (err) {
      log.error("Error cleaning up connection: %s", err);
    }
  });
}

export async function sendViaWstoOrgHandler(
  orgId: string,
  message: orgWsMessage,
) {
  try {
    publisher.publish(WS_CHANNEL, JSON.stringify({ orgId, data: message }));
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
