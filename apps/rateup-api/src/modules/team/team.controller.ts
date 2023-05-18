
import { FastifyReply, FastifyRequest } from "fastify";
import {
    createTeam, deleteTeamById, getTeamsByOrgId,
} from "./team.service";
import { CreateTeamInput, DeleteTeamInput, GetTeamsByOrgInput } from "./team.schema";

export async function createTeamHandler(
    request: FastifyRequest<{
      Body: CreateTeamInput;
    }>,
    reply: FastifyReply
  ) {
    const body = request.body;

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

export async function getAllTeamsByOrgHandler(
  request: FastifyRequest<{
    Params: GetTeamsByOrgInput;
  }>,
  reply: FastifyReply
) {
  try {
    const teams = await getTeamsByOrgId({orgId: request.params.orgId});
    if (!teams) {
      reply.code(404);
    } else {
      reply.send(teams);
    }
  } catch (e) {
    reply.send(500);
  }
}

export async function deleteTeamByIdHandler(
  request: FastifyRequest<{
    Params: DeleteTeamInput;
  }>,
  reply: FastifyReply
) {
  try {
    const team = await deleteTeamById(request.params.id);
    if (!team) {
      reply.code(404);
    } else {
      reply.code(200).send("Deleted team.")
    }
  } catch (e) {
    console.log(e);
    reply.code(500);
  }
}