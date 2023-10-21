import { FastifyRequest, FastifyReply } from "fastify";
import { hasAccessOfTeamAdmin, hasAccessToTeam } from "../../utils/auth";
import { ByTeamIdParams, EditTeamInput, IdParamInput } from "./team.schema";
import Session from "supertokens-node/recipe/session";


export async function verifyTeamAdminAccess(
    request: FastifyRequest<{
        Body: EditTeamInput,
        Params: IdParamInput
    }>,
    reply: FastifyReply
  ) {
    const teamId = request.params.id;
    const userId = request.userId;

    if(!userId){
        reply.code(403).send({ message: "Unauthorised" });
    }

    const hasAccess = await hasAccessOfTeamAdmin(teamId, userId);
  
    if (!hasAccess) {
      reply.code(403).send({ message: "You don't have team admin access" });
    }
  }

/**
 * Verifies if the user has access to the teamId in the params
 * @param request 
 * @param reply 
 */
export async function verifyTeamAccess(
    request: FastifyRequest<{
        Params: ByTeamIdParams;
    }>,
    reply: FastifyReply
) {
    const teamId = request.params.teamId;
    const hasAccess = await hasAccessToTeam(teamId, request.userId);
    if (!hasAccess) {
        reply.code(403).send({ message: "You don't have access to this team" });
    }
}