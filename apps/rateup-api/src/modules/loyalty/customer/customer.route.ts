import { FastifyInstance } from "fastify";
import {
  createLCustomerHandler,
  deleteLoyaltyCustomersHandler,
  getLoyaltyCustomersHandler,
} from "./customer.controller";
import { $lCustomerRef } from "./customer.schema";

export async function loyaltyCustomerRoutes(server: FastifyInstance) {
  server.get("/", getLoyaltyCustomersHandler);
  server.delete("/:id", deleteLoyaltyCustomersHandler);
}
