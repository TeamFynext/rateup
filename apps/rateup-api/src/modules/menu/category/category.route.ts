import { FastifyInstance } from "fastify";
import {
  createMenuCategoryHandler,
  deleteMenuCategoryHandler,
  getAllMenuCategoriesHandler,
  getMenuCategoryHandler,
  sortMenuCategoryHandler,
  updateMenuCategoryHandler,
} from "./category.controller.js";
import { $MCref } from "./category.schema.js";
import { $Mref } from "../menu.schema.js";
import { verifyMenuAccess } from "../menu.auth.js";
import { verifyMenuCategoryAccess } from "./category.auth.js";
import { checkSession } from "../../../utils/checkSession.js";
import { getVerifySubscriptionHandler } from "../../../utils/auth.js";
import { SubscriptionFeaturePathName } from "../../../types/enums.js";

export async function menuCategoryRoutes(server: FastifyInstance) {
  server.addHook("preHandler", checkSession);
  server.addHook(
    "preHandler",
    getVerifySubscriptionHandler([SubscriptionFeaturePathName.Menu]),
  );

  server.post(
    "/",
    {
      schema: {
        body: $MCref("CreateMenuCategorySchema"),
      },
    },
    createMenuCategoryHandler,
  );

  server.get(
    "/all/:menuId",
    {
      schema: {
        params: $Mref("ByMenuIdParamsSchema"),
      },
      preHandler: verifyMenuAccess,
    },
    getAllMenuCategoriesHandler,
  );

  server.get(
    "/:categoryId",
    {
      schema: {
        params: $MCref("ByCategoryIdParamsSchema"),
      },
      preHandler: verifyMenuCategoryAccess,
    },
    getMenuCategoryHandler,
  );

  server.put(
    "/:categoryId",
    {
      schema: {
        params: $MCref("ByCategoryIdParamsSchema"),
        body: $MCref("UpdateMenuCategoryInputSchema"),
      },
      preHandler: verifyMenuCategoryAccess,
    },
    updateMenuCategoryHandler,
  );
  server.put(
    "/sort/:menuId",
    {
      schema: {
        params: $Mref("ByMenuIdParamsSchema"),
        body: $MCref("SortMenuCategoryInputSchema"),
      },
      preHandler: verifyMenuAccess,
    },
    sortMenuCategoryHandler,
  );

  server.delete(
    "/:categoryId",
    {
      schema: {
        params: $MCref("ByCategoryIdParamsSchema"),
      },
      preHandler: verifyMenuCategoryAccess,
    },
    deleteMenuCategoryHandler,
  );
}
