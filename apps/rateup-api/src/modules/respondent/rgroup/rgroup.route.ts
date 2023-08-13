import { FastifyInstance } from "fastify";
import { addRespondentsToRGroupHandler, createRGroupFromPhoneNumbersHandler, deleteRGroupByIdHandler, deleteRespondentFromRGroupHandler, getAllRGroupsHandler, getRGroupsByTeamIdHandler, getRGroupsSurveyHistoryByGroupIdHandler, getRespondentsByRGroupIdHandler, updateRGroupHandler } from "./rgroup.controller";
import { $RGref } from "./rgroup.schema";
import { verifySession } from "supertokens-node/recipe/session/framework/fastify";

export async function rgroupRoutes(server: FastifyInstance) {
    server.addHook("preHandler", verifySession())
    // TODO: verify whether the requestor has access to the team
    // TODO: add missing schemas
    server.post(
        "/",
        {
            schema: {
                body: $RGref("createRGroupInputSchema")
            }
        },
        createRGroupFromPhoneNumbersHandler
    );

    server.get("/", getAllRGroupsHandler)
    server.get("/team/:teamId", getRGroupsByTeamIdHandler)

    server.get("/:rgroupId/respondents", getRespondentsByRGroupIdHandler)
    server.get("/:rgroupId/history/surveys", getRGroupsSurveyHistoryByGroupIdHandler)

    server.post(
        "/:rgroupId/respondents",
        {
            schema: {
                body: $RGref("addRespondentsToRGroupInputSchema"),
                params: $RGref("rGroupsByIdParamsSchema")
            }
        },
        addRespondentsToRGroupHandler)

    server.put("/:rgroupId", {
        schema: {
            body: $RGref("updateRgroupInputSchema"),
            params: $RGref("rGroupsByIdParamsSchema")
        }
    }, updateRGroupHandler)

    server.delete("/:rgroupId/respondent/:respondentId", deleteRespondentFromRGroupHandler)
    server.delete("/:rgroupId", deleteRGroupByIdHandler)
}
