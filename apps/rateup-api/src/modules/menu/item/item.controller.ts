import { FastifyReply, FastifyRequest } from "fastify";
import { ByMenuItemIdParams, CreateMenuItemInput, UpdateMenuItemInput } from "./item.schema.js";
import {
  createMenuItem,
  createMenuItemUsingCsv,
  deleteMenuItem,
  getMenuItem,
  getMenuItemByCategory,
  sortMenuItem,
  updateMenuItem,
} from "./item.service.js";
import { ByCategoryIdParams, SortMenuCategoryInput } from "../category/category.schema.js";
import { hasAccessToCategory } from "../category/category.auth.js";

export async function createMenuItemHandler(
  request: FastifyRequest<{ Body: CreateMenuItemInput }>,
  reply: FastifyReply,
) {
  if (!hasAccessToCategory(request.body.categoryId, request.userId)) {
    reply.code(403).send({ message: "You don't have access to this menu" });
  }

  const menuItem = await createMenuItem(request.body);
  reply.send(menuItem);
}

export async function createMenuItemUsingCsvHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const data = await request.file();
    const menu = await createMenuItemUsingCsv(data, data.fields.menuId["value"]);
    reply.send(menu);
  } catch (error) {
    reply.code(500).send(error);
  }
}

export async function getMenuItemHandler(
  request: FastifyRequest<{ Params: ByMenuItemIdParams }>,
  reply: FastifyReply,
) {
  const menuItem = await getMenuItem(request.params.menuItemId);
  reply.send(menuItem);
}

export async function getMenuItemByCategoryHandler(
  request: FastifyRequest<{ Params: ByCategoryIdParams }>,
  reply: FastifyReply,
) {
  const menuItems = await getMenuItemByCategory(request.params.categoryId);
  reply.send(menuItems);
}

export async function updateMenuItemHandler(
  request: FastifyRequest<{
    Params: ByMenuItemIdParams;
    Body: UpdateMenuItemInput;
  }>,
  reply: FastifyReply,
) {
  const menuItem = await updateMenuItem(request.params.menuItemId, request.body);
  reply.send(menuItem);
}

export async function sortMenuItemHandler(
  request: FastifyRequest<{
    Body: SortMenuCategoryInput;
    Params: ByCategoryIdParams;
  }>,
  reply: FastifyReply,
) {
  try {
    const menuItem = await sortMenuItem(request.params.categoryId, request.body);
    reply.status(200).send(menuItem);
  } catch (error) {
    reply.status(500).send(error);
  }
}
export async function deleteMenuItemHandler(
  request: FastifyRequest<{ Params: ByMenuItemIdParams }>,
  reply: FastifyReply,
) {
  const menuItem = await deleteMenuItem(request.params.menuItemId);
  reply.send(menuItem);
}
