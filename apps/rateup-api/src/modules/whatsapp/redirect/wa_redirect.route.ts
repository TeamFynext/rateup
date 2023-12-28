import { FastifyInstance } from "fastify";
import { tokenizeIpHandler } from "./wa_redirect.controller";

export async function waRedirectRoutes(server: FastifyInstance) {
    server.post(
        "/",
        tokenizeIpHandler
    );
}