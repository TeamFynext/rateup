import { FastifyReply, FastifyRequest } from "fastify";
import { CreateMenuInput, ByMenuIdParams, UpdateMenuInput } from "./menu.schema";
import { createMenu, deleteMenu, getFullMenu, getMenu, getMenus, updateMenu } from "./menu.service";
import { ByTeamIdParams } from "../team/team.schema";
import Session from "supertokens-node/recipe/session";
import { hasAccessToTeam } from "../../utils/auth";

export async function createMenuHandler(
    request: FastifyRequest<{ Body: CreateMenuInput }>,
    reply: FastifyReply
) {
    let session = await Session.getSession(request, reply);
    let userId = session.getUserId();

    if(!hasAccessToTeam(request.body.teamId, userId)) {
        reply.code(403).send({ message: "You don't have access to this team" });
    }

    const data = request.body;
    const menu = await createMenu(data);
    reply.send(menu);
}

export async function getAllMenusHandler(
    request: FastifyRequest<{ Params: ByTeamIdParams }>,
    reply: FastifyReply
) {
    const menus = await getMenus(request.params.teamId);
    reply.send(menus);
}

export async function getMenuByIdHandler(
    request: FastifyRequest<{ Params: ByMenuIdParams }>,
    reply: FastifyReply
) {
    const menu = await getMenu(request.params.menuId);
    reply.send(menu);
}
export async function getFullMenuByIdHandler(
    request: FastifyRequest<{ Params: ByMenuIdParams }>,
    reply: FastifyReply
) {
    const menu = await getFullMenu(request.params.menuId);
    reply.send(menu);
}
export async function updateMenuHandler(
    request: FastifyRequest<{ Params: ByMenuIdParams, Body: UpdateMenuInput }>,
    reply: FastifyReply
) {
    const menuId = request.params.menuId;
    const data = request.body;
    const menu = await updateMenu(menuId, data);
    reply.send(menu);
}

export async function deleteMenuHandler(
    request: FastifyRequest<{ Params: ByMenuIdParams }>,
    reply: FastifyReply
) {
    const menu = await deleteMenu(request.params.menuId);
    reply.send(menu);
}