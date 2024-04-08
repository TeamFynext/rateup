import { FastifyInstance } from "fastify";
import { handleWebSocketConnection } from "./wamessage.ws.controller";
// Maintain a mapping of orgId to WebSocket connections

export async function waWSMessageRoutes(server: FastifyInstance) {
  server.get("/message/:orgId", { websocket: true }, handleWebSocketConnection);
}
