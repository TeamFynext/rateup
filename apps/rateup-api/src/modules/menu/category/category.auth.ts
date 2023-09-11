import { FastifyRequest, FastifyReply } from "fastify";
import Session from "supertokens-node/recipe/session";
import { ByCategoryIdParams } from "./category.schema";
import prisma from "../../../utils/prisma";
import { hasAccessToTeam } from "../../../utils/auth";

export async function verifyMenuCategoryAccess(
    request: FastifyRequest<{
        Params: ByCategoryIdParams;
    }>,
    reply: FastifyReply
) {
    const categoryId = request.params.categoryId;
    let session = await Session.getSession(request, reply);
    let userId = session.getUserId();

    const hasAccess = await hasAccessToCategory(categoryId, userId);
    if (!hasAccess) {
        reply.code(403).send({ message: "You don't have access to this menu item" });
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
                        teamId: true
                    }
                }
            }
        })

        return await hasAccessToTeam(category.menu.teamId, userId)
    } catch (e) {
        console.error(e)
        return false;
    }
}