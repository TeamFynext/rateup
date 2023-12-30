import { FastifyReply, FastifyRequest } from "fastify";
import {
  createOrg,
  getAllMembersWithTeams,
  getAllOrgs,
  getOrgStats,
  getTeamsMembers,
  updateOrgDetails,
  updateOrgLogo,
  updateOrgUserRole,
} from "./org.services";
import {
  CreateOrgInput,
  IdParamInput,
  UpdateLogoInput,
  UpdateOrgDetailsInput,
  UpdateRoleInput,
} from "./org.schema";
import Session from "supertokens-node/recipe/session";

export async function createOrgHandler(
  request: FastifyRequest<{
    Body: CreateOrgInput;
  }>,
  reply: FastifyReply,
) {
  const body = request.body;
  try {
    const survey = await createOrg(body);
    reply.code(201).send(survey);
  } catch (e: any) {
    // TODO
    console.error(e);

    reply.code(500).send({ error: e.message });
  }
}

export async function getAllTeamsAndMembers(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    let session = await Session.getSession(request, reply);

    const accessTokenPayload = session.getAccessTokenPayload();
    const orgId = accessTokenPayload.orgId;

    const teamsMembers = await getTeamsMembers(orgId);

    if (!teamsMembers || teamsMembers.length === 0) {
      reply.code(200).send({ message: "No teams found." });
    } else {
      reply.send({ message: `Success`, data: teamsMembers });
    }
  } catch (e) {
    console.error(e);
    reply.code(500).send();
  }
}

export async function getAllMembersWithTeamsHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    let session = await Session.getSession(request, reply);

    const accessTokenPayload = session.getAccessTokenPayload();
    const orgId = accessTokenPayload.orgId;

    const teamsMembers = await getAllMembersWithTeams(orgId);

    if (!teamsMembers || teamsMembers.length === 0) {
      reply.code(200).send({ message: "No teams found." });
    } else {
      reply.send({ message: `Success`, data: teamsMembers });
    }
  } catch (e) {
    console.error(e);
    reply.code(500).send();
  }
}

export async function updateRoleController(
  request: FastifyRequest<{
    Body: UpdateRoleInput;
    Params: IdParamInput;
  }>,
  reply: FastifyReply,
) {
  const body = request.body;
  const id = request.params;
  let roleUpdate;

  if (!body.role) {
    reply.code(400).send({ success: false, message: "Role is required" });
    return;
  }

  try {
    roleUpdate = await updateOrgUserRole(
      body as { role: string },
      id,
      request,
      reply,
    );

    // Check if the roleUpdate is an error message
    if (typeof roleUpdate === "string") {
      reply.code(400).send({ success: false, message: roleUpdate });
      return;
    }
  } catch (e: any) {
    console.error(e);
    reply.code(500).send({ success: false, message: e.message });
    return;
  }

  reply.code(201).send({ success: true, data: roleUpdate });
}

export async function updateLogoHandler(
  request: FastifyRequest<{
    Body: UpdateLogoInput;
  }>,
  reply: FastifyReply,
) {
  const body = request.body;
  let user;

  try {
    user = await updateOrgLogo(body, request, reply);
  } catch (e: any) {
    console.error(e);
    reply.code(500).send({ success: false, message: e.message });
    return;
  }

  reply.code(201).send({ success: true, data: "Logo Updated..!" });
}

export async function updateOrgDetailsHandler(
  request: FastifyRequest<{
    Body: UpdateOrgDetailsInput;
  }>,
  reply: FastifyReply,
) {
  const body = request.body;
  try {
    let user = await updateOrgDetails(body, request, reply);
  } catch (e: any) {
    console.error(e);
    reply.code(500).send({ success: false, message: e.message });
    return;
  }

  reply.code(201).send({ success: true, data: "Logo Updated..!" });
}

export async function getAllOrgsHandler(
  _: FastifyRequest,
  reply: FastifyReply,
) {
  const orgs = await getAllOrgs();
  reply.send(orgs);
}

export async function getOrgStatsHandler(
  request: FastifyRequest<{
    Params: { orgId: string };
  }>,
  reply: FastifyReply,
) {
  const orgStats = await getOrgStats(request.params.orgId);
  reply.send(orgStats);
}
