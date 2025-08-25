import { FastifyInstance } from "fastify/types/instance";
import { checkSession } from "../../../utils/checkSession";
import {
  deRegisterBusinessClientHandler,
  getUserAccessTokenHanlder,
  registerBusinessClientHandler,
} from "./wa_auth.controller";

export async function waAuthRoutes(server: FastifyInstance) {
  server.addHook("preHandler", checkSession);

  server.post("/register", registerBusinessClientHandler);
  server.post("/deregister/:phoneId", deRegisterBusinessClientHandler);
  server.post("/user-token/:waSettingsId", getUserAccessTokenHanlder);
}
