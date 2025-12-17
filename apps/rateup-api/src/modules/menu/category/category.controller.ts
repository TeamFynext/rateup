import { FastifyRequest, FastifyReply } from "fastify";
import {
  ByCategoryIdParams,
  CreateMenuCategoryInput,
  SortMenuCategoryInput,
  UpdateMenuCategoryInput,
} from "./category.schema.js";
import {
  createMenuCategory,
  deleteMenuCategory,
  getMenuCategories,
  sortMenuCategory,
  updateMenuCategory,
} from "./category.service.js";
import { ByMenuIdParams } from "../menu.schema.js";
import { hasAccessToMenu } from "../menu.auth.js";

export async function createMenuCategoryHandler(
  request: FastifyRequest<{ Body: CreateMenuCategoryInput }>,
  reply: FastifyReply,
) {
  if (!hasAccessToMenu(request.body.menuId, request.userId)) {
    reply.code(403).send({ message: "You don't have access to this menu" });
  }

  const data = request.body;
  const category = await createMenuCategory(data);
  reply.send(category);
}

export async function getAllMenuCategoriesHandler(
  request: FastifyRequest<{ Params: ByMenuIdParams }>,
  reply: FastifyReply,
) {
  try {
    const hasAccess = hasAccessToMenu(request.params.menuId, request.userId);
    if (!hasAccess) {
      reply.code(403).send({ message: "You don't have access to this menu" });
      return;
    }
    const categories = await getMenuCategories(request.params.menuId);
    reply.send(categories);
  } catch (err) {
    console.log(err);
    reply.code(500);
  }
}

export async function getMenuCategoryHandler(
  request: FastifyRequest<{ Params: ByCategoryIdParams }>,
  reply: FastifyReply,
) {
  const category = await getMenuCategories(request.params.categoryId);
  reply.send(category);
}

export async function updateMenuCategoryHandler(
  request: FastifyRequest<{
    Body: UpdateMenuCategoryInput;
    Params: ByCategoryIdParams;
  }>,
  reply: FastifyReply,
) {
  const data = request.body;
  const category = await updateMenuCategory(request.params.categoryId, data);
  reply.send(category);
}

export async function sortMenuCategoryHandler(
  request: FastifyRequest<{
    Body: SortMenuCategoryInput;
    Params: ByMenuIdParams;
  }>,
  reply: FastifyReply,
) {
  try {
    const data = request.body;
    const category = await sortMenuCategory(request.params.menuId, data);
    reply.code(200).send(category);
  } catch (error) {
    reply.code(500).send(error);
  }
}

export async function deleteMenuCategoryHandler(
  request: FastifyRequest<{ Params: ByCategoryIdParams }>,
  reply: FastifyReply,
) {
  const category = await deleteMenuCategory(request.params.categoryId);
  reply.send(category);
}
