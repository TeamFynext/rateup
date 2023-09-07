import { FastifyRequest, FastifyReply } from "fastify";
import Session from "supertokens-node/recipe/session";
import { ByMenuIdParams } from "./menu.schema";
import prisma from "../../utils/prisma";
import { hasAccessToTeam } from "../../utils/auth";



export async function verifyMenuAccess(
    request: FastifyRequest<{
        Params: ByMenuIdParams;
    }>,
    reply: FastifyReply
) {
    const menuId = request.params.menuId;
    let session = await Session.getSession(request, reply);
    let userId = session.getUserId();

    const hasAccess = await hasAccessToMenu(menuId, userId);
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
                teamId: true
            }
        })

        return await hasAccessToTeam(menu.teamId, userId)
    } catch (e) {
        console.error(e)
        return false;
    }
}