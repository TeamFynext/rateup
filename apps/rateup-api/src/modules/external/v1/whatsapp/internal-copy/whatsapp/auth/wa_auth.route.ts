import { FastifyInstance } from "fastify/types/instance.js";
import {
  deRegisterBusinessClientHandler,
  registerBusinessClientHandler,
} from "./wa_auth.controller.js";
import { checkSession } from "../../../../../../../utils/checkSession.js";

export async function waAuthRoutes(server: FastifyInstance) {
  server.addHook("preHandler", checkSession);

  server.post("/register", registerBusinessClientHandler);
  server.post("/deregister/:phoneId", deRegisterBusinessClientHandler);
}
