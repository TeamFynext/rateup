import { FastifyInstance } from "fastify";
import { getFullMenuByIdHandler, getMenuByIdHandler } from "./menu.controller";
import { $Mref } from "./menu.schema";

export async function menuPublicRoutes(server: FastifyInstance) {
    server.get(
        "/:menuId",
        {
            schema: {
                params: $Mref("ByMenuIdParamsSchema"),
            }
        },
        getMenuByIdHandler
    ),
        server.get(
            "/full/:menuId",
            {
                schema: {
                    params: $Mref("ByMenuIdParamsSchema"),
                    response: {
                        200: $Mref("fullMenuPublicResponseSchema")
                    }
                }
            },
            getFullMenuByIdHandler
        )
}