import { FastifyRequest, FastifyReply } from "fastify";
import { ByCategoryIdParams } from "./category.schema.js";
import prisma from "../../../utils/prisma.js";
import { hasAccessToTeam } from "../../../utils/auth.js";

export async function verifyMenuCategoryAccess(
  request: FastifyRequest<{
    Params: ByCategoryIdParams;
  }>,
  reply: FastifyReply,
) {
  const categoryId = request.params.categoryId;
  const hasAccess = await hasAccessToCategory(categoryId, request.userId);
  if (!hasAccess) {
    reply
      .code(403)
      .send({ message: "You don't have access to this menu item" });
  }
}

export async function hasAccessToCategory(categoryId: string, userId: string) {
  try {
    const category = await prisma.menuCategory.findUnique({
      where: {
        id: categoryId,
      },
      select: {
        menu: {
          select: {
            teamId: true,
          },
        },
      },
    });

    return await hasAccessToTeam(category.menu.teamId, userId);
  } catch (e) {
    console.error(e);
    return false;
  }
}
