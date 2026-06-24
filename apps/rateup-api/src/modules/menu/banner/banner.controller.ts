import { FastifyReply, FastifyRequest } from "fastify";
import { ByMenuBannerIdParams, CreateMenuBannerInput } from "./banner.schema.js";
import {
  createMenuBanner,
  deletemenuBanner,
  getMenuBanner,
  updateMenuBanner,
} from "./banner.service.js";
import { ByMenuIdParams } from "../menu.schema.js";

export async function createMenuBannerHandler(
  request: FastifyRequest<{ Body: CreateMenuBannerInput }>,
  reply: FastifyReply,
) {
  try {
    const menu = await createMenuBanner(request.body);
    reply.send(menu);
  } catch (error) {
    reply.code(500).send(error);
  }
}
//
export async function getMenuBannerHandler(
  request: FastifyRequest<{ Params: ByMenuIdParams }>,
  reply: FastifyReply,
) {
  try {
    const menuBanner = await getMenuBanner(request.params?.menuId);
    reply.send(menuBanner);
  } catch (error) {
    reply.code(500).send(error);
  }
}

export async function updateMenuBannerHandler(
  request: FastifyRequest<{
    Body: CreateMenuBannerInput;
    Params: ByMenuBannerIdParams;
  }>,
  reply: FastifyReply,
) {
  try {
    const menuBanner = await updateMenuBanner(request.params.menuBannerId, request.body);
    reply.send(menuBanner);
  } catch (error) {
    reply.code(500).send(error);
  }
}

export async function deleteMenuBannerHandler(
  request: FastifyRequest<{
    Params: ByMenuBannerIdParams;
  }>,
  reply: FastifyReply,
) {
  try {
    const menuBanner = await deletemenuBanner(request.params.menuBannerId);
    reply.send(menuBanner);
  } catch (error) {
    reply.code(500).send(error);
  }
}
