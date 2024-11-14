import { FastifyInstance } from "fastify";
import { loyaltyCustomerPublicRoutes } from "./customer/customer.public.route";
import { loyaltyRedeemPublicRoutes } from "./redeems/redeem.public.route";

export async function loyaltyPublicRoutes(server: FastifyInstance) {
  server.register(loyaltyCustomerPublicRoutes, { prefix: "/customer" });
  server.register(loyaltyRedeemPublicRoutes, { prefix: "/redeem" });
}
