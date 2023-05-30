import { FastifyReply, FastifyRequest } from "fastify";
import { completeInvite, createTeam, deleteTeamById, getTeamsByUserId, getTeamMembers, getTeamsByOrgId, inviteTeamMember } from "./team.service";
import {
  CreateTeamInput,
  DeleteTeamInput,
  GetTeamMembersInput,
  GetTeamsByOrgInput,
  InviteCompleteInput,
  InviteMemberInput,
} from "./team.schema";
import Session from "supertokens-node/recipe/session";

export async function createTeamHandler(
  request: FastifyRequest<{
    Body: CreateTeamInput;
  }>,
  reply: FastifyReply
) {
  const body = request.body;
  let team;

  try {
    team = await createTeam(body);
  } catch (e: any) {
    console.error(e);
    reply.code(500).send({ success: false, message: e.message });
    return;
  }
  
  reply.code(201).send(team);
}

export async function getAllTeamsByOrgHandler(
  request: FastifyRequest<{
    Params: GetTeamsByOrgInput;
  }>,
  reply: FastifyReply
) {
  try {
    const teams = await getTeamsByOrgId({ orgId: request.params.orgId });
    if (!teams || teams.length === 0) {
      reply.code(200).send({ message: "No teams found for this organization" });
    } else {
      reply.send(teams);
    }
  } catch (e) {
    reply.code(500).send({ message: "Internal server error" });
  }
}

export async function getTeamsByUserHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    let session = await Session.getSession(request, reply);
    let userId = session.getUserId();
    const teams = await getTeamsByUserId(userId);
    if (!teams || teams.length === 0) {
      reply.code(200).send({ message: "No teams found." });
    } else {
      reply.send({ message: `Teams found for user : ${userId}`, data: teams });
    }
  } catch (e) {
    console.error(e)
    reply.code(500).send();
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
      reply.code(200).send("Deleted team.");
    }
  } catch (e) {
    console.log(e);
    reply.code(500);
  }
}


export async function inviteMemberHandler(
  request: FastifyRequest<{
    Body: InviteMemberInput;
  }>,
  reply: FastifyReply
) {
  const body = request.body;

  try {
    const invite = await inviteTeamMember(body);
    //reply.code(201).send({ success: true, data: team });
    reply.code(201).send(invite);

    //TODO Auth
  } catch (e: any) {
    console.error(e);
    reply.code(500).send({ success: false, message: e.message });
  }
}

export async function completeInviteHandler(
  request: FastifyRequest<{
    Params: InviteCompleteInput;
  }>,
  reply: FastifyReply
) {

  try {
    const invite = await completeInvite(request.params.token);
    reply.code(200).send({ message: "Invite Accepted successfully.", data: invite });
  } catch (e) {
    reply.code(500).send({ message: "Internal server error"});
  }
}


//Get Team Members by Team Id

export async function getTeamMembersHandler(
  request: FastifyRequest<{
    Params: GetTeamMembersInput;
  }>,
  reply: FastifyReply
) {

  try {
    const members = await getTeamMembers({ teamId: request.params.teamId });
    if (!members || members.length === 0) {
      reply.code(200).send({ message: "No members found for this team" });
    } else {
      reply.send(members);
    }
  } catch (e) {
    reply.code(500).send({ message: "Internal server error"});
  }
}