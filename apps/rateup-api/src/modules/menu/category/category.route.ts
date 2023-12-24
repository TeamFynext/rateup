import { FastifyInstance } from "fastify";
import { createMenuCategoryHandler, deleteMenuCategoryHandler, getAllMenuCategoriesHandler, getMenuCategoryHandler, sortMenuCategoryHandler, updateMenuCategoryHandler } from "./category.controller";
import { $MCref } from "./category.schema";
import { $Mref } from "../menu.schema";
import { verifyMenuAccess } from "../menu.auth";
import { verifyMenuCategoryAccess } from "./category.auth";
import { checkSession } from "../../../utils/checkSession";
import { SubscriptionFeatureName } from "../../../types/enums";
import { getVerifySubscriptionHandler } from "../../../utils/auth";

export async function menuCategoryRoutes(server: FastifyInstance) {
    server.addHook('preHandler', checkSession)
    server.addHook("preHandler", getVerifySubscriptionHandler([SubscriptionFeatureName.Menu]));

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
    server.put(
        "/sort/:menuId",
        {
            schema: {
                params: $Mref("ByMenuIdParamsSchema"),
                body: $MCref("SortMenuCategoryInputSchema")
            },
            preHandler: verifyMenuAccess
        },
        sortMenuCategoryHandler
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