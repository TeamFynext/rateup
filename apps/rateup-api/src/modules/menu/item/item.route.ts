import { FastifyInstance } from "fastify";
import { createMenuItemHandler, createMenuItemUsingCsvHandler, deleteMenuItemHandler, getMenuItemByCategoryHandler, getMenuItemHandler, sortMenuItemHandler, updateMenuItemHandler } from "./item.controller";
import { $MIref } from "./item.schema";
import { $MCref } from "../category/category.schema";
import { verifySession } from "supertokens-node/recipe/session/framework/fastify";
import { verifyMenuItemAccess } from "./item.auth";
import { verifyMenuCategoryAccess } from "../category/category.auth";
import { checkSession } from "../../../utils/checkSession";
import fastifyMultipart from "@fastify/multipart";
import { SubscriptionFeatureName } from "../../../types/enums";
import { getVerifySubscriptionHandler } from "../../../utils/auth";

export async function menuItemRoutes(server: FastifyInstance) {
    server.addHook("preHandler", checkSession);
    server.addHook("preHandler", getVerifySubscriptionHandler([SubscriptionFeatureName.Menu]));

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

    server.put(
        "/sort/:categoryId",
        {
            schema: {
                params:  $MCref("ByCategoryIdParamsSchema"),
                body: $MCref("SortMenuCategoryInputSchema")
            },
            preHandler: verifyMenuCategoryAccess
        },
        sortMenuItemHandler
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
    server.register(fastifyMultipart);
    server.post(
      "/create-using-csv",
      createMenuItemUsingCsvHandler
    );
}