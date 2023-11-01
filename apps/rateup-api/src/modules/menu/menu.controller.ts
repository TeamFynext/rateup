import { FastifyReply, FastifyRequest } from "fastify";
import {
  CreateMenuInput,
  ByMenuIdParams,
  UpdateMenuInput,
  updateMenuLandingInput,
  updateLandingPageOption,
} from "./menu.schema";
import {
  createMenu,
  deleteMenu,
  getAllMenus,
  getFullMenu,
  getMenu,
  getMenuLanding,
  getMenus,
  updateLandingPage,
  updateMenu,
  updateMenuLanding,
} from "./menu.service";
import { ByTeamIdParams } from "../team/team.schema";
import Session from "supertokens-node/recipe/session";
import { hasAccessToTeam } from "../../utils/auth";
import { getLoggedUserInfo } from "../user/user.service";

export async function createMenuHandler(
  request: FastifyRequest<{ Body: CreateMenuInput }>,
  reply: FastifyReply
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
  reply: FastifyReply
) {
  const userData = await getLoggedUserInfo(request, reply);

  const menus = await getAllMenus(userData);
  reply.send(menus);
}

export async function getAllMenusByTeamIdHandler(
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
  request: FastifyRequest<{ Params: ByMenuIdParams; Body: UpdateMenuInput }>,
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

export async function getMenuLandingHandler(
  request: FastifyRequest<{ Params: ByMenuIdParams }>,
  reply: FastifyReply
) {
  try {
    const menu = await getMenuLanding(request.params.menuId);
    reply.code(200).send(menu);
  } catch (error) {
    reply.code(500).send(error);
  }
}

export async function updateMenuLandingHandler(
  request: FastifyRequest<{
    Params: ByMenuIdParams;
    body: updateMenuLandingInput;
  }>,
  reply: FastifyReply
) {
  try {
    const menu = await updateMenuLanding(request.params.menuId, request.body);
    reply.code(200).send(menu?.data);
  } catch (error) {
    reply.code(500).send(error);
  }
}
export async function updateLandingPageOptionHandler(
  request: FastifyRequest<{
    Params: ByMenuIdParams;
    body: updateLandingPageOption;
  }>,
  reply: FastifyReply
) {
  try {
    await updateLandingPage(request.params.menuId, request.body);
    reply.code(200).send("landing page options updated");
  } catch (error) {
    reply.code(500).send(error);
  }
}
