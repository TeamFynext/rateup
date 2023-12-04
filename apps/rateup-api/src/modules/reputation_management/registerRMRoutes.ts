import { FastifyInstance } from "fastify";
import { reviewsRoutes } from "./reviews/review.route";
import { RM_TopicRoutes } from "./topics/topic.route";
import { reviewSchemas } from "./reviews/review.schema";

export async function reputationManagementRoutes(server: FastifyInstance) {

    const modules = [
        reviewSchemas
    ]

    for (const module of modules) {
        for (const schema of module) {
            server.addSchema(schema);
        }
    }

    server.register(reviewsRoutes, { prefix: "/review" })
    server.register(RM_TopicRoutes, { prefix: "/topic" })
}