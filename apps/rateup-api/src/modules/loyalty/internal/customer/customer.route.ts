import { FastifyInstance } from "fastify";
import { checkSession } from "../../../../utils/checkSession";
import {
  createLCustomerHandler,
  deleteLCustomerHandler,
  getLCustomerByIdHandler,
  getLCustomersByOrgHandler,
  updateLCustomerHandler,
} from "./customer.controller";

export async function loyaltyCustomerRoutes(server: FastifyInstance) {
  server.addHook("preHandler", checkSession);

  server.get("/", getLCustomersByOrgHandler);
  server.get("/:lCustomerId", getLCustomerByIdHandler);
  server.post("/", createLCustomerHandler);
  server.put("/:lCustomerId", updateLCustomerHandler);
  server.delete("/:lCustomerId", deleteLCustomerHandler); // TODO: just mark as deleted?
}
