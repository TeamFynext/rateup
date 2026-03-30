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
import { verifyMenuItemAccess } from "./item.auth.js";
import { verifyMenuCategoryAccess } from "../category/category.auth.js";
import { checkSession } from "../../../utils/checkSession.js";
import fastifyMultipart from "@fastify/multipart";
import { getVerifySubscriptionHandler } from "../../../utils/auth.js";
import { SubscriptionFeaturePathName } from "../../../types/enums.js";
import {
  ByMenuItemIdParamsSchema,
  createMenuItemInputSchema,
} from "./item.schema.js";
import {
  ByCategoryIdParamsSchema,
  SortMenuCategoryInputSchema,
} from "../category/category.schema.js";

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
        body: createMenuItemInputSchema,
      },
    },
    createMenuItemHandler,
  );

  server.get(
    "/:menuItemId",
    {
      schema: {
        params: ByMenuItemIdParamsSchema,
      },
      preHandler: verifyMenuItemAccess,
    },
    getMenuItemHandler,
  );

  server.get(
    "/all/:categoryId",
    {
      schema: {
        params: ByCategoryIdParamsSchema,
      },
      preHandler: verifyMenuCategoryAccess,
    },
    getMenuItemByCategoryHandler,
  );

  server.put(
    "/:menuItemId",
    {
      schema: {
        params: ByMenuItemIdParamsSchema,
      },
      preHandler: verifyMenuItemAccess,
    },
    updateMenuItemHandler,
  );

  server.put(
    "/sort/:categoryId",
    {
      schema: {
        params: ByCategoryIdParamsSchema,
        body: SortMenuCategoryInputSchema,
      },
      preHandler: verifyMenuCategoryAccess,
    },
    sortMenuItemHandler,
  );

  server.delete(
    "/:menuItemId",
    {
      schema: {
        params: ByMenuItemIdParamsSchema,
      },
      preHandler: verifyMenuItemAccess,
    },
    deleteMenuItemHandler,
  );
  server.register(fastifyMultipart);
  server.post("/create-using-csv", createMenuItemUsingCsvHandler);
}
