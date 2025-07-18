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

export async function handleWebSocketConnection(
  connection: any,
  request: FastifyRequest<{ Params: { afterAuthId: string } }>,
) {
  const afterAuthId = request.params.afterAuthId;
  connectionManager.addConnection(afterAuthId, connection);

  connection.on("message", (message) => {
    console.log("Received message: ", message);
  });

  connection.on("close", () => {
    connectionManager.removeConnection(afterAuthId, connection);
  });

  connection.on("error", (error) => {
    console.error("WebSocket error: ", error);
  });
}

export async function sendViaWstoOrgHandler(
  orgId: string,
  message: orgWsMessage,
) {
  const connections = connectionManager.getConnectionsBasedOnOrgId(orgId);
  for await (const connection of connections) {
    try {
      connection.send(JSON.stringify(message));
    } catch (err) {
      log.error("WebSocket send error: %s", err);
    }
  }
}
