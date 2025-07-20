import { FastifyReply, FastifyRequest } from "fastify";
import { connectionManager } from "./org.ws.class";
import { orgWsMessage } from "../../../types/global";
import { log } from "../../../utils/logger";
import redisConnection from "../../../utils/redisConnection";

export async function orgWsAuthCheckHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const { orgId } = request.user;
  const afterAuthId = connectionManager.generateAfterAuthIdforOrgId(orgId);
  reply.send({ afterAuthId });
}
type Client = {
  socket: WebSocket;
  orgId: string;
  browserId: string;
};

// Store active connections in memory for direct socket access
const activeConnections = new Map<string, Client>();

// Redis key helpers
const getOrgConnectionsKey = (orgId: string) => `org:${orgId}:connections`;
const getConnectionKey = (orgId: string, browserId: string) =>
  `conn:${orgId}:${browserId}`;

export async function handleWebSocketConnection(
  connection: any,
  request: FastifyRequest<{ Params: { afterAuthId: string } }>,
) {
  const browserId = request.params.afterAuthId;
  const orgId = request.user.orgId;
  if (!orgId || !browserId) {
    connection.close();
    return;
  }

  const connectionId = `${orgId}:${browserId}`;
  const client: Client = { socket: connection, orgId, browserId };

  // Check for existing connection in Redis
  const existingConnectionId = await redisConnection.hget(
    getOrgConnectionsKey(orgId),
    browserId,
  );
  if (existingConnectionId) {
    // Close existing connection if it exists in memory
    const existingClient = activeConnections.get(existingConnectionId);
    if (existingClient?.socket?.readyState === WebSocket.OPEN) {
      existingClient.socket.close();
    }
    activeConnections.delete(existingConnectionId);
  }

  // Store new connection
  activeConnections.set(connectionId, client);
  await redisConnection.hset(
    getOrgConnectionsKey(orgId),
    browserId,
    connectionId,
  );

  // Set TTL of 24 hours (86400 seconds) for both keys
  const ttlSeconds = 24 * 60 * 60; // 24 hours

  await redisConnection.setex(
    getConnectionKey(orgId, browserId),
    ttlSeconds,
    JSON.stringify({
      orgId,
      browserId,
      connectedAt: new Date().toISOString(),
    }),
  );

  connection.on("message", (msg) => {
    console.log("Received message: ", msg);
  });

  connection.on("close", async () => {
    try {
      activeConnections.delete(connectionId);
      await redisConnection.hdel(getOrgConnectionsKey(orgId), browserId);
      await redisConnection.del(getConnectionKey(orgId, browserId));

      // Clean up org key if no more connections
      const remainingConnections = await redisConnection.hlen(
        getOrgConnectionsKey(orgId),
      );
      if (remainingConnections === 0) {
        await redisConnection.del(getOrgConnectionsKey(orgId));
      }
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
    const connectionIds = await redisConnection.hvals(
      getOrgConnectionsKey(orgId),
    );

    for (const connectionId of connectionIds) {
      const client = activeConnections.get(connectionId);
      if (client && client.socket.readyState === client.socket.OPEN) {
        try {
          client.socket.send(JSON.stringify(message));
        } catch (err) {
          log.error("WebSocket send error: %s", err);
        }
      }
    }
  } catch (err) {
    log.error("Error sending message to org %s: %s", orgId, err);
  }
}
