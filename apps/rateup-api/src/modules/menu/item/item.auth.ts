import { FastifyReply, FastifyRequest } from "fastify";
import { ByMenuItemIdParams } from "./item.schema.js";
import prisma from "../../../utils/prisma.js";
import { hasAccessToTeam } from "../../../utils/auth.js";

export async function verifyMenuItemAccess(
  request: FastifyRequest<{
    Params: ByMenuItemIdParams;
  }>,
  reply: FastifyReply,
) {
  const menuItemId = request.params.menuItemId;

  const hasAccess = await hasAccessToMenuItem(menuItemId, request.userId);
  if (!hasAccess) {
    reply
      .code(403)
      .send({ message: "You don't have access to this menu item" });
  }
}

export async function hasAccessToMenuItem(menuItemId: string, userId: string) {
  try {
    const menuItem = await prisma.menuItem.findUnique({
      where: {
        id: menuItemId,
      },
      select: {
        category: {
          select: {
            menu: {
              select: {
                teamId: true,
              },
            },
          },
        },
      },
    });

    return await hasAccessToTeam(menuItem!.category.menu.teamId, userId);
  } catch (e) {
    console.error(e);
    return false;
  }
}
