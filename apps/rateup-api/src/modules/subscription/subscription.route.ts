import { FastifyInstance } from "fastify";
import { checkSession } from "../../utils/checkSession";
import { getSubscriptionHandler } from "./subscription.controller";

export async function subscriptionRoutes(server: FastifyInstance) {
    server.addHook('preHandler', checkSession);

    server.get('/', getSubscriptionHandler)
}