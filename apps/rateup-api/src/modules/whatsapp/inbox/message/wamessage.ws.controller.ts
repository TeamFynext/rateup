import { FastifyRequest } from "fastify";
import { connectionManager } from "./wamessage.ws.class";

export async function handleWebSocketConnection(
  connection: any,
  request: FastifyRequest<{ Params: { orgId: string } }>,
) {
  const orgId = request.params.orgId;
  connectionManager.addConnection(orgId, connection);

  connection.on("message", (message) => {
    console.log("Received message: ", message);
  });

  connection.on("close", () => {
    connectionManager.removeConnection(orgId, connection);
  });

  connection.on("error", (error) => {
    console.error("WebSocket error: ", error);
  });
}

export async function handleSendWsMessage(orgId: string, message: any) {
  const connections = connectionManager.getConnections(orgId);
  connections.forEach((connection) => {
    connection.send(JSON.stringify(message));
  });
}
