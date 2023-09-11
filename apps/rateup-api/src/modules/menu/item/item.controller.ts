import { FastifyReply, FastifyRequest } from "fastify";
import { ByMenuItemIdParams, CreateMenuItemInput, UpdateMenuItemInput } from "./item.schema";
import { createMenuItem, deleteMenuItem, getMenuItem, getMenuItemByCategory, updateMenuItem } from "./item.service";
import { ByCategoryIdParams } from "../category/category.schema";
import Session from "supertokens-node/recipe/session";
import { hasAccessToCategory } from "../category/category.auth";

export async function createMenuItemHandler(
    request: FastifyRequest<{ Body: CreateMenuItemInput }>,
    reply: FastifyReply
) {
    let session = await Session.getSession(request, reply);
    let userId = session.getUserId();

    if(!hasAccessToCategory(request.body.categoryId, userId)) {
        reply.code(403).send({ message: "You don't have access to this menu" });
    }

    const menuItem = await createMenuItem(request.body);
    reply.send(menuItem);
}

export async function getMenuItemHandler(
    request: FastifyRequest<{ Params: ByMenuItemIdParams}>,
    reply: FastifyReply
) {
    const menuItem = await getMenuItem(request.params.menuItemId);
    reply.send(menuItem);
}

export async function getMenuItemByCategoryHandler(
    request: FastifyRequest<{ Params: ByCategoryIdParams}>,
    reply: FastifyReply
) {
    const menuItems = await getMenuItemByCategory(request.params.categoryId);
    reply.send(menuItems);
}

export async function updateMenuItemHandler(
    request: FastifyRequest<{ Params: ByMenuItemIdParams, Body: UpdateMenuItemInput }>,
    reply: FastifyReply
) {
    const menuItem = await updateMenuItem(request.params.menuItemId, request.body);
    reply.send(menuItem);
}

export async function deleteMenuItemHandler(
    request: FastifyRequest<{ Params: ByMenuItemIdParams}>,
    reply: FastifyReply
) {
    const menuItem = await deleteMenuItem(request.params.menuItemId);
    reply.send(menuItem);
}