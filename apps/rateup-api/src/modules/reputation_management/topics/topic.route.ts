import { FastifyInstance } from "fastify";
import { log } from "../../../utils/logger";
import { createTopicHandler, deleteTopicHandler, getTopicsHandler, updateTopicHandler } from "./topic.controller";
import { checkSession } from "../../../utils/checkSession";

export async function RM_TopicRoutes(server: FastifyInstance) {
    server.setErrorHandler((error, request, reply) => {
        log.error(error);
        reply.send(error);
    })

    // TODO: auth
    server.get("/:teamId", getTopicsHandler);
    server.post("/", createTopicHandler);
    server.put("/:id", updateTopicHandler);
    server.delete("/:id", deleteTopicHandler);
}