import { FastifyInstance } from "fastify";
import { createRespondentsHandler, getAllRGroupsByPhoneHandler, getRespondentByIdHandler, getAllRespondentResponseHistoryHandler, getAllRespondentSurveyHistoryHandler, getAllRespondentsHandler, updateRespondentByIdHandler, getRespondentsByTeamIdHandler, getRespSurveyHistoryByRespondentIdHandler, getRespResponseHistoryByRespondentIdHandler, getRGroupsByRespondentIdHandler } from "./respondent.controller";
import { $Respondentref } from "./respondent.schema";
import { verifySession } from "supertokens-node/recipe/session/framework/fastify";

// todo: verify team access
export async function respondentRoutes(server: FastifyInstance) {
    server.addHook("preHandler", verifySession())

    server.get("/", getAllRespondentsHandler);
    server.get(
        "/team/:teamId",
        getRespondentsByTeamIdHandler
    )
    server.post("/", createRespondentsHandler)
    server.get("/:respondentId", getRespondentByIdHandler);
    server.get("/phone/:phone/history/surveys", getAllRespondentSurveyHistoryHandler);
    server.get("/phone/:phone/history/responses", getAllRespondentResponseHistoryHandler);

    server.get("/:respondentId/history/surveys", getRespSurveyHistoryByRespondentIdHandler);
    server.get("/:respondentId/history/responses", getRespResponseHistoryByRespondentIdHandler);

    server.put(
        "/:respondentId",
        {
            schema: {
                body: $Respondentref("updateRespondentInputSchema"),
                params: $Respondentref("respondentByIdParamsSchema"),
            }
        },
        updateRespondentByIdHandler
    );

    server.get(
        "/phone/:phone/groups",
        {
            schema: {
                params: $Respondentref("respondentByPhoneParamsSchema"),
            }
        },
        getAllRGroupsByPhoneHandler
    );
    server.get(
        "/:respondentId/groups",
        {
            schema: {
                params: $Respondentref("respondentByIdParamsSchema"),
            }
        },
        getRGroupsByRespondentIdHandler
    );
}