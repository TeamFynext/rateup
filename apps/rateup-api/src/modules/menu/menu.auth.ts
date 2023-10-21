import { FastifyRequest, FastifyReply } from "fastify";
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
                teamId: true
            }
        })

        return await hasAccessToTeam(menu.teamId, userId)
    } catch (e) {
        console.error(e)
        return false;
    }
}