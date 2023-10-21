import { FastifyInstance } from "fastify";
import { createMenuCategoryHandler, deleteMenuCategoryHandler, getAllMenuCategoriesHandler, getMenuCategoryHandler, updateMenuCategoryHandler } from "./category.controller";
import { $MCref } from "./category.schema";
import { $Mref } from "../menu.schema";
import { verifyMenuAccess } from "../menu.auth";
import { verifyMenuCategoryAccess } from "./category.auth";
import { checkSession } from "../../../utils/checkSession";

export async function menuCategoryRoutes(server: FastifyInstance) {
    server.addHook('preHandler', checkSession)
    server.post(
        "/",
        {
            schema: {
                body: $MCref("CreateMenuCategorySchema")
            }
        },
        createMenuCategoryHandler
    );

    server.get(
        "/all/:menuId",
        {
            schema: {
                params: $Mref("ByMenuIdParamsSchema")
            },
            preHandler: verifyMenuAccess
        },
        getAllMenuCategoriesHandler
    )

    server.get(
        "/:categoryId",
        {
            schema: {
                params: $MCref("ByCategoryIdParamsSchema")
            },
            preHandler: verifyMenuCategoryAccess
        },
        getMenuCategoryHandler
    )

    server.put(
        "/:categoryId",
        {
            schema: {
                params: $MCref("ByCategoryIdParamsSchema"),
                body: $MCref("UpdateMenuCategoryInputSchema")
            },
            preHandler: verifyMenuCategoryAccess
        },
        updateMenuCategoryHandler
    )

    server.delete(
        "/:categoryId",
        {
            schema: {
                params: $MCref("ByCategoryIdParamsSchema")
            },
            preHandler: verifyMenuCategoryAccess
        },
        deleteMenuCategoryHandler
    )
}