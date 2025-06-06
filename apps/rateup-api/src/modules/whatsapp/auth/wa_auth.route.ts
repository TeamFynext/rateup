import { FastifyInstance } from "fastify/types/instance";
import { checkSession } from "../../../utils/checkSession";
import {
  deRegisterBusinessClientHandler,
  registerBusinessClientHandler,
} from "./wa_auth.controller";

export async function waAuthRoutes(server: FastifyInstance) {
  server.addHook("preHandler", checkSession);

  server.post("/register", registerBusinessClientHandler);
  server.post("/deregister/:phoneId", deRegisterBusinessClientHandler);
}
