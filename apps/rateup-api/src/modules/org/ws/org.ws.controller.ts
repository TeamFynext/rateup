import { FastifyReply, FastifyRequest } from "fastify";
import { connectionManager } from "./org.ws.class";
import { orgWsMessage } from "../../../types/global";
import { log } from "../../../utils/logger";
import baseRedis from "../../../utils/redisConnection";
import { WebSocket } from "@fastify/websocket";

const subscriber = baseRedis.duplicate();
const publisher = baseRedis.duplicate();

export const WS_CHANNEL = "ws:messages";

// Store active connections in memory for direct socket access
const activeConnections = new Map<string, Map<string, WebSocket>>();

subscriber.on("message", (channel, message) => {
  if (channel === WS_CHANNEL) {
    const parsedMessage = JSON.parse(message);
    const { orgId, data, roleFilter } = parsedMessage;
    const connections = activeConnections.get(orgId);
    if (!connections) return;
    for (const client of connections?.values()) {
      if (
        client.readyState === 1 &&
        (!roleFilter || (client as any).role === roleFilter)
      ) {
        client.send(JSON.stringify(data));
      }
    }
  }
});

subscriber.subscribe(WS_CHANNEL);

export async function handleWebSocketConnection(
  connection: WebSocket,
  request: FastifyRequest<{
    Params: { afterAuthId: string; orgId?: string };
    Querystring: {
      role?: string;
    };
  }>,
) {
  const browserId = request.params.afterAuthId;
  const orgId = request.user?.orgId || request.params.orgId;
  const role = request.query.role || "main";

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
    console.log(`[${orgId} - ${role}] Received message:`, msg.toString());
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
  roleFilter?: string,
) {
  try {
    publisher.publish(
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
