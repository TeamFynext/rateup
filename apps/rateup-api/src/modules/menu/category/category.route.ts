import { FastifyInstance } from "fastify";
import {
  createMenuCategoryHandler,
  deleteMenuCategoryHandler,
  getAllMenuCategoriesHandler,
  getMenuCategoryHandler,
  sortMenuCategoryHandler,
  updateMenuCategoryHandler,
} from "./category.controller.js";

import { verifyMenuAccess } from "../menu.auth.js";
import { verifyMenuCategoryAccess } from "./category.auth.js";
import { checkSession } from "../../../utils/checkSession.js";
import { getVerifySubscriptionHandler } from "../../../utils/auth.js";
import { SubscriptionFeaturePathName } from "../../../types/enums.js";
import {
  ByCategoryIdParamsSchema,
  CreateMenuCategorySchema,
  SortMenuCategoryInputSchema,
  UpdateMenuCategoryInputSchema,
} from "./category.schema.js";
import { ByMenuIdParamsSchema } from "../menu.schema.js";

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
        body: CreateMenuCategorySchema,
      },
    },
    createMenuCategoryHandler,
  );

  server.get(
    "/all/:menuId",
    {
      schema: {
        params: ByMenuIdParamsSchema,
      },
      preHandler: verifyMenuAccess,
    },
    getAllMenuCategoriesHandler,
  );

  server.get(
    "/:categoryId",
    {
      schema: {
        params: ByCategoryIdParamsSchema,
      },
      preHandler: verifyMenuCategoryAccess,
    },
    getMenuCategoryHandler,
  );

  server.put(
    "/:categoryId",
    {
      schema: {
        params: ByCategoryIdParamsSchema,
        body: UpdateMenuCategoryInputSchema,
      },
      preHandler: verifyMenuCategoryAccess,
    },
    updateMenuCategoryHandler,
  );
  server.put(
    "/sort/:menuId",
    {
      schema: {
        params: ByMenuIdParamsSchema,
        body: SortMenuCategoryInputSchema,
      },
      preHandler: verifyMenuAccess,
    },
    sortMenuCategoryHandler,
  );

  server.delete(
    "/:categoryId",
    {
      schema: {
        params: ByCategoryIdParamsSchema,
      },
      preHandler: verifyMenuCategoryAccess,
    },
    deleteMenuCategoryHandler,
  );
}
