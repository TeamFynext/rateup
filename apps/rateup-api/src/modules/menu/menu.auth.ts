import { FastifyRequest, FastifyReply } from "fastify";
import { ByMenuIdParams, CreateMenuInput } from "./menu.schema.js";
import prisma from "../../utils/prisma.js";
import { hasAccessToTeam } from "../../utils/auth.js";
import { SubscriptionFeaturePathName } from "../../types/enums.js";
import { sendUsageLimitMailAlert } from "../../utils/email/payments/usageLimitAlert.js";

export async function verifyMenuAccess(
  request: FastifyRequest<{
    Params: ByMenuIdParams;
  }>,
  reply: FastifyReply,
) {
  const menuId = request.params.menuId;

  const hasAccess = await hasAccessToMenu(menuId, request.userId);
  if (!hasAccess) {
    reply.code(403).send({ message: "You don't have access to this menu item" });
  }
}

export async function hasAccessToMenu(menuId: string, userId: string) {
  try {
    const menu = await prisma.menu.findUnique({
      where: {
        id: menuId,
      },
      select: {
        teamId: true,
      },
    });

    return await hasAccessToTeam(menu.teamId, userId);
  } catch (e) {
    console.error(e);
    return false;
  }
}

export async function verifyMenuMaxCountRestriction(
  request: FastifyRequest<{ Body: CreateMenuInput }>,
  reply: FastifyReply,
) {
  const count = await prisma.menu.count({
    where: {
      teamId: request.body.teamId,
    },
  });

  if (count >= request.subscription.features[SubscriptionFeaturePathName.Menu].count.max) {
    const team = await prisma.team.findUnique({
      where: {
        id: request.body.teamId,
      },
    });
    await sendUsageLimitMailAlert(team.orgId);
    reply.code(403).send({
      message: "You have reached the maximum limit of menus",
      displayMessageInClient: true,
    });
  }
}
