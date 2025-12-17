import { FastifyInstance } from "fastify";
import {
  createMenuItemHandler,
  createMenuItemUsingCsvHandler,
  deleteMenuItemHandler,
  getMenuItemByCategoryHandler,
  getMenuItemHandler,
  sortMenuItemHandler,
  updateMenuItemHandler,
} from "./item.controller.js";
import { $MIref } from "./item.schema.js";
import { $MCref } from "../category/category.schema.js";
import { verifyMenuItemAccess } from "./item.auth.js";
import { verifyMenuCategoryAccess } from "../category/category.auth.js";
import { checkSession } from "../../../utils/checkSession.js";
import fastifyMultipart from "@fastify/multipart";
import { getVerifySubscriptionHandler } from "../../../utils/auth.js";
import { SubscriptionFeaturePathName } from "../../../types/enums.js";

export async function menuItemRoutes(server: FastifyInstance) {
  server.addHook("preHandler", checkSession);
  server.addHook(
    "preHandler",
    getVerifySubscriptionHandler([SubscriptionFeaturePathName.Menu]),
  );

  server.post(
    "/",
    {
      schema: {
        body: $MIref("createMenuItemInputSchema"),
      },
    },
    createMenuItemHandler,
  );

  server.get(
    "/:menuItemId",
    {
      schema: {
        params: $MIref("ByMenuItemIdParamsSchema"),
      },
      preHandler: verifyMenuItemAccess,
    },
    getMenuItemHandler,
  );

  server.get(
    "/all/:categoryId",
    {
      schema: {
        params: $MCref("ByCategoryIdParamsSchema"),
      },
      preHandler: verifyMenuCategoryAccess,
    },
    getMenuItemByCategoryHandler,
  );

  server.put(
    "/:menuItemId",
    {
      schema: {
        params: $MIref("ByMenuItemIdParamsSchema"),
      },
      preHandler: verifyMenuItemAccess,
    },
    updateMenuItemHandler,
  );

  server.put(
    "/sort/:categoryId",
    {
      schema: {
        params: $MCref("ByCategoryIdParamsSchema"),
        body: $MCref("SortMenuCategoryInputSchema"),
      },
      preHandler: verifyMenuCategoryAccess,
    },
    sortMenuItemHandler,
  );

  server.delete(
    "/:menuItemId",
    {
      schema: {
        params: $MIref("ByMenuItemIdParamsSchema"),
      },
      preHandler: verifyMenuItemAccess,
    },
    deleteMenuItemHandler,
  );
  server.register(fastifyMultipart);
  server.post("/create-using-csv", createMenuItemUsingCsvHandler);
}
