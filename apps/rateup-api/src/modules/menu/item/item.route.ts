import { FastifyInstance } from "fastify";
import { createMenuItemHandler, deleteMenuItemHandler, getMenuItemByCategoryHandler, getMenuItemHandler, updateMenuItemHandler } from "./item.controller";
import { $MIref } from "./item.schema";
import { $MCref } from "../category/category.schema";
import { verifySession } from "supertokens-node/recipe/session/framework/fastify";
import { verifyMenuItemAccess } from "./item.auth";
import { verifyMenuCategoryAccess } from "../category/category.auth";

export async function menuItemRoutes(server: FastifyInstance) {
    server.addHook("preHandler", verifySession());

    server.post(
        "/",
        {
            schema: {
                body: $MIref("createMenuItemInputSchema")
            }
        },
        createMenuItemHandler
    );

    server.get(
        "/:menuItemId",
        {
            schema: {
                params: $MIref("ByMenuItemIdParamsSchema")
            },
            preHandler: verifyMenuItemAccess
        },
        getMenuItemHandler
    );

    server.get(
        "/all/:categoryId",
        {
            schema: {
                params: $MCref("ByCategoryIdParamsSchema")
            },
            preHandler: verifyMenuCategoryAccess
        },
        getMenuItemByCategoryHandler
    )

    server.put(
        "/:menuItemId",
        {
            schema: {
                params: $MIref("ByMenuItemIdParamsSchema"),
            },
            preHandler: verifyMenuItemAccess
        },
        updateMenuItemHandler
    )

    server.delete(
        "/:menuItemId",
        {
            schema: {
                params: $MIref("ByMenuItemIdParamsSchema"),
            },
            preHandler: verifyMenuItemAccess
        },
        deleteMenuItemHandler
    )
}