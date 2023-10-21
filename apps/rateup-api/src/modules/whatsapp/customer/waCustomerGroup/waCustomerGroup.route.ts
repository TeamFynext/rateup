import { FastifyInstance } from "fastify";
import { addWaCustomersToWaCustomerGroupHandler, createWaCustomerGroupFromPhoneNumbersHandler, deleteWaCustomerGroupByIdHandler, deleteWaCustomerFromWaCustomerGroupHandler, getAllWaCustomerGroupsHandler, getWaCustomerGroupsByTeamIdHandler, getWaCustomerGroupsSurveyHistoryByGroupIdHandler, getWaCustomersByWaCustomerGroupIdHandler, updateWaCustomerGroupHandler } from "./waCustomerGroup.controller";
import { $WaCGref } from "./waCustomerGroup.schema";
import { checkSession } from "../../../../utils/checkSession";

export async function waCustomerGroupRoutes(server: FastifyInstance) {
    server.addHook("preHandler", checkSession)
    // TODO: verify whether the requestor has access to the team
    // TODO: add missing schemas
    server.post(
        "/",
        {
            schema: {
                body: $WaCGref("createWaCustomerGroupInputSchema")
            }
        },
        createWaCustomerGroupFromPhoneNumbersHandler
    );

    server.get("/", getAllWaCustomerGroupsHandler)
    server.get("/team/:teamId", getWaCustomerGroupsByTeamIdHandler)

    server.get("/:waCustomerGroupId/waCustomers", getWaCustomersByWaCustomerGroupIdHandler)
    server.get("/:waCustomerGroupId/history/surveys", getWaCustomerGroupsSurveyHistoryByGroupIdHandler)

    server.post(
        "/:waCustomerGroupId/waCustomers",
        {
            schema: {
                body: $WaCGref("addWaCustomersToWaCustomerGroupInputSchema"),
                params: $WaCGref("waCustomerGroupsByIdParamsSchema")
            }
        },
        addWaCustomersToWaCustomerGroupHandler)

    server.put("/:waCustomerGroupId", {
        schema: {
            body: $WaCGref("updateWaCustomerGroupInputSchema"),
            params: $WaCGref("waCustomerGroupsByIdParamsSchema")
        }
    }, updateWaCustomerGroupHandler)

    server.delete("/:waCustomerGroupId/waCustomer/:waCustomerId", deleteWaCustomerFromWaCustomerGroupHandler)
    server.delete("/:waCustomerGroupId", deleteWaCustomerGroupByIdHandler)
}
