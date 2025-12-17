import { FastifyInstance } from "fastify";
import { loyaltyCustomerPublicRoutes } from "./customer/customer.public.route.js";

export async function loyaltyPublicRoutes(server: FastifyInstance) {
  server.register(loyaltyCustomerPublicRoutes, { prefix: "/customer" });
}
