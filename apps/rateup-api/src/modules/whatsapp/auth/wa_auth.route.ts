import { FastifyInstance } from "fastify/types/instance.js";
import {
  deRegisterBusinessClientHandler,
  getUserAccessTokenHanlder,
  registerBusinessClientHandler,
} from "./wa_auth.controller.js";
import { declareAccess } from "../../../authz/registry.js";

export async function waAuthRoutes(server: FastifyInstance) {
  declareAccess(server, { access: "session" });

  server.post("/register", registerBusinessClientHandler);
  server.post("/deregister/:phoneId", deRegisterBusinessClientHandler);
  server.post("/user-token/:waSettingsId", getUserAccessTokenHanlder);
}
