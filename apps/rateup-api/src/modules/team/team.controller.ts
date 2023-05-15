
import { FastifyReply, FastifyRequest } from "fastify";
import {
    createTeam,
} from "./team.service";
import { CreateTeamInput } from "./team.schema";

export async function createTeamHandler(
    request: FastifyRequest<{
      Body: CreateTeamInput;
    }>,
    reply: FastifyReply
  ) {
    const body = request.body;
    let session = request.session;
    let accessTokenPayload = session.getAccessTokenPayload();
    let role = accessTokenPayload.role

      if (role !== 'SUPER_ADMIN') {
        throw new Error('Action is only allowed for super admin.');
      }else{
        try {
          const team = await createTeam(body);
          //reply.code(201).send({ success: true, data: team });
          reply.code(201).send(team);
    
          //TODO Auth
        } catch (e:any) {
          console.error(e);
          reply.code(500).send({ success: false, message: e.message });
        }
      }
  }