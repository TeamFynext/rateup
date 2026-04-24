import { FastifyReply, FastifyRequest } from "fastify";
import {
  CreateMenuInput,
  ByMenuIdParams,
  UpdateMenuInput,
} from "./menu.schema.js";
import {
  createMenu,
  deleteMenu,
  getAllMenus,
  getFullMenu,
  getMenuLanding,
  getMenus,
  updateMenu,
  updateVisitedMenuLanding,
} from "./menu.service.js";
import { ByTeamIdParams } from "../team/team.schema.js";
import { hasAccessToTeam } from "../../utils/auth.js";
import { getLoggedUserInfo } from "../user/user.service.js";

export async function createMenuHandler(
  request: FastifyRequest<{ Body: CreateMenuInput }>,
  reply: FastifyReply,
) {
  if (!hasAccessToTeam(request.body.teamId, request.userId)) {
    reply.code(403).send({ message: "You don't have access to this team" });
  }

  const data = request.body;
  const menu = await createMenu(data);
  reply.send(menu);
}

export async function getAllMenusHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const userData = await getLoggedUserInfo(request, reply);

  const menus = await getAllMenus(userData);
  reply.send(menus);
}

export async function getAllMenusByTeamIdHandler(
  request: FastifyRequest<{ Params: ByTeamIdParams }>,
  reply: FastifyReply,
) {
  const menus = await getMenus(request.params.teamId);
  reply.send(menus);
}
export async function getMenuByIdHandler(
  request: FastifyRequest<{ Params: ByMenuIdParams }>,
  reply: FastifyReply,
) {
  try {
    const menu = await getMenuLanding(request.params.menuId);
    reply.code(200).send(menu);
  } catch (error) {
    reply.code(500).send(error);
  }
}
export async function getFullMenuByIdHandler(
  request: FastifyRequest<{ Params: ByMenuIdParams }>,
  reply: FastifyReply,
) {
  const menu = await getFullMenu(request.params.menuId);
  return reply.send(menu);
}
export async function updateMenuHandler(
  request: FastifyRequest<{ Params: ByMenuIdParams; Body: UpdateMenuInput }>,
  reply: FastifyReply,
) {
  const menuId = request.params.menuId;
  const data = request.body;
  const menu = await updateMenu(menuId, data);
  reply.send(menu);
}

export async function deleteMenuHandler(
  request: FastifyRequest<{ Params: ByMenuIdParams }>,
  reply: FastifyReply,
) {
  const menu = await deleteMenu(request.params.menuId);
  reply.send(menu);
}

export async function getMenuLandingHandler(
  request: FastifyRequest<{ Params: ByMenuIdParams }>,
  reply: FastifyReply,
) {
  try {
    const menu = await getMenuLanding(request.params.menuId);
    reply.code(200).send(menu);
  } catch (error) {
    reply.code(500).send(error);
  }
}

export async function visitedMenuLandingHandler(
  request: FastifyRequest<{
    Params: ByMenuIdParams;
  }>,
  reply: FastifyReply,
) {
  try {
    const updateVisited = await updateVisitedMenuLanding(request.params.menuId);
    if (!updateVisited) {
      reply.code(404);
    } else {
      reply.code(200).send({ status: "success" });
    }
  } catch (e) {
    reply.code(500).send({ status: "error", message: e });
  }
}
