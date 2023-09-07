import { FastifyInstance } from "fastify";
import { $Mref } from "./menu.schema";
import { createMenuHandler, deleteMenuHandler, getAllMenusHandler, getFullMenuByIdHandler, getMenuByIdHandler, updateMenuHandler } from "./menu.controller";
import { $Tref } from "../team/team.schema";
import { verifyTeamAccess} from "../team/team.auth";
import { verifyMenuAccess } from "./menu.auth";

export async function menuRoutes(server: FastifyInstance) {
    server.post(
        "/",
        {
            schema: {
                body: $Mref("menuInputSchema"),
            }
        },
        createMenuHandler
    )

    server.get(
        "/all/:teamId",
        {
            schema: {
                params: $Tref("byTeamIdParamsSchema")
            },
            preHandler: verifyTeamAccess
        },
        getAllMenusHandler
    )

    server.get(
        "/:menuId",
        {
            schema: {
                params: $Mref("ByMenuIdParamsSchema")
            },
            preHandler: verifyMenuAccess
        },
        getMenuByIdHandler
    )

    server.get(
        "/full/:menuId",
        {
            schema: {
                params: $Mref("ByMenuIdParamsSchema")
            },
            preHandler: verifyMenuAccess
        },
        getFullMenuByIdHandler
    )

    server.put(
        "/:menuId",
        {
            schema: {
                body: $Mref("updateMenuInputSchema"),
                params: $Mref("ByMenuIdParamsSchema")
            },
            preHandler: verifyMenuAccess
        },
        updateMenuHandler
    )
    server.delete(
        "/:menuId",
        {
            schema: {
                params: $Mref("ByMenuIdParamsSchema")
            },
            preHandler: verifyMenuAccess
        },
        deleteMenuHandler
    )
}