import { FastifyRequest, FastifyReply } from "fastify";
import { hasAccessOfTeamAdmin } from "../../utils/auth";
import { EditTeamInput, IdParamInput } from "./team.schema";
import Session from "supertokens-node/recipe/session";


export async function verifyTeamAdminAccess(
    request: FastifyRequest<{
        Body: EditTeamInput,
        Params: IdParamInput
    }>,
    reply: FastifyReply
  ) {
    const teamId = request.params.id;
    let session = await Session.getSession(request, reply);
    let userId = session.getUserId();

    if(!userId){
        reply.code(403).send({ message: "Unauthorised" });
    }

    const hasAccess = await hasAccessOfTeamAdmin(teamId, userId);
  
    if (!hasAccess) {
      reply.code(403).send({ message: "You don't have team admin access" });
    }
  }