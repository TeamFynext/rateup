import { FastifyReply, FastifyRequest } from "fastify";
import { connectionManager } from "./org.ws.class";
import { orgWsMessage } from "../../../types/global";
import { log } from "../../../utils/logger";

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
};

const orgClientsMap = new Map<string, Map<string, Client>>();

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
  const client: Client = { socket: connection };

  if (!orgClientsMap.has(orgId)) {
    orgClientsMap.set(orgId, new Map());
  }

  const browserMap = orgClientsMap.get(orgId)!;

  // If there's already a connection for this browserId, close the old one
  const existingClient = browserMap.get(browserId);
  if (existingClient?.socket?.readyState === WebSocket.OPEN) {
    existingClient.socket.close(); // Cleanly close old connection
  }

  browserMap.set(browserId, client);

  connection.on("message", (msg) => {
    console.log("Received message: ", msg);
  });

  connection.on("close", () => {
    const browserMap = orgClientsMap.get(orgId);
    if (browserMap) {
      browserMap.delete(browserId);
      if (browserMap.size === 0) {
        orgClientsMap.delete(orgId);
      }
    }
  });
}

export async function sendViaWstoOrgHandler(
  orgId: string,
  message: orgWsMessage,
) {
  const browserMap = orgClientsMap.get(orgId);
  if (!browserMap) return;

  for (const client of browserMap.values()) {
    if (client.socket.readyState === client.socket.OPEN) {
      try {
        client.socket.send(JSON.stringify(message));
      } catch (err) {
        log.error("WebSocket send error: %s", err);
      }
    }
  }
}
