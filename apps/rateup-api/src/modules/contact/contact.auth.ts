import { FastifyRequest, FastifyReply } from "fastify";
import { hasAccessToTeam } from "../../utils/auth";
import { getTeamById } from "../team/team.service";
import { ByContactIdParams } from "./contact.schema";
import { getContactById } from "./contact.service";

export async function verifyContactAccess(
    request: FastifyRequest<{
        Params: ByContactIdParams;
    }>,
    reply: FastifyReply
) {

}

export async function hasAccessToContact(contactId: string, userId: string) {
    const contact = await getContactById(contactId);
    if (!contact) {
        return false;
    }
    const hasAccess = await hasAccessToTeam(contact.teamId, userId)
    return hasAccess;
}