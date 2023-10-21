import { FastifyInstance } from "fastify";
import { createWaCustomersHandler, getAllWaCustomerGroupsByPhoneHandler, getWaCustomerByIdHandler, getAllWaCustomerResponseHistoryHandler, getAllWaCustomerSurveyHistoryHandler, getAllWaCustomersHandler, updateWaCustomerByIdHandler, getWaCustomersByTeamIdHandler, getRespSurveyHistoryByWaCustomerIdHandler, getRespResponseHistoryByWaCustomerIdHandler, getWaCustomerGroupsByWaCustomerIdHandler, deleteWaCustomerByIdHandler } from "./waCustomer.controller";
import { $WaCustomerRef } from "./waCustomer.schema";
import { checkSession } from "../../../../utils/checkSession";

// todo: verify team access
export async function waCustomerRoutes(server: FastifyInstance) {
    server.addHook("preHandler", checkSession)

    server.get("/", getAllWaCustomersHandler);
    server.get(
        "/team/:teamId",
        getWaCustomersByTeamIdHandler
    )
    server.post("/", createWaCustomersHandler)
    server.get("/:waCustomerId", getWaCustomerByIdHandler);
    server.get("/phone/:phone/history/surveys", getAllWaCustomerSurveyHistoryHandler);
    server.get("/phone/:phone/history/responses", getAllWaCustomerResponseHistoryHandler);

    server.get("/:waCustomerId/history/surveys", getRespSurveyHistoryByWaCustomerIdHandler);
    server.get("/:waCustomerId/history/responses", getRespResponseHistoryByWaCustomerIdHandler);

    server.put(
        "/:waCustomerId",
        {
            schema: {
                body: $WaCustomerRef("updateWaCustomerInputSchema"),
                params: $WaCustomerRef("waCustomerByIdParamsSchema"),
            }
        },
        updateWaCustomerByIdHandler
    );

    server.get(
        "/phone/:phone/groups",
        {
            schema: {
                params: $WaCustomerRef("waCustomerByPhoneParamsSchema"),
            }
        },
        getAllWaCustomerGroupsByPhoneHandler
    );
    server.get(
        "/:waCustomerId/groups",
        {
            schema: {
                params: $WaCustomerRef("waCustomerByIdParamsSchema"),
            }
        },
        getWaCustomerGroupsByWaCustomerIdHandler
    );
    server.delete(
        "/:waCustomerId",
        {
            schema: {
                params: $WaCustomerRef("waCustomerByIdParamsSchema"),
            }
        },
        deleteWaCustomerByIdHandler
    )
}