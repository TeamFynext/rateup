import { FastifyInstance } from "fastify";
import { fetchReviewsHandler, getReviewsByTeamIdHandler } from "./review.controller";
import { log } from "../../../utils/logger";
import { $Tref } from "../../team/team.schema";
import { checkSession } from "../../../utils/checkSession";
import { verifyTeamAccess } from "../../team/team.auth";
import { $ReviweRef } from "./review.schema";

export async function reviewsRoutes(server: FastifyInstance) {

    server.setErrorHandler((error, request, reply) => {
        log.error(error);
        reply.send(error);
    })

    server.addHook("preHandler", checkSession)

    server.get(
        "/:teamId",
        {
            preHandler: verifyTeamAccess,
            schema: {
                params: $Tref("byTeamIdParamsSchema"),
                querystring: $ReviweRef("getReviewQuery")
            }
        },
        getReviewsByTeamIdHandler
    );
    server.post(
        "/:teamId/fetch",
        {
            schema: {
                body: {
                    type: "object",
                    properties: {
                        dataId: { type: "string" }
                    }
                },
                params: $Tref("byTeamIdParamsSchema")
            }
        },
        fetchReviewsHandler
    )
}