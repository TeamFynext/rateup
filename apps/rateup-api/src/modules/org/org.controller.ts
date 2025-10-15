import { FastifyReply, FastifyRequest } from "fastify";
import {
  completeOrgDetails,
  createOrg,
  deleteOrg,
  getAllMembersWithTeams,
  getAllOrgs,
  getOrgNameAndUserPhone,
  getOrgStats,
  getTeamsMembers,
  pauseOrg,
  updateOrgDetails,
  updateOrgLogo,
  updateOrgUserRole,
} from "./org.services";
import {
  ByOrgIdParams,
  CreateOrgInput,
  IdParamInput,
  PauseOrgInput,
  UpdateLogoInput,
  UpdateOrgDetailsInput,
  UpdateRoleInput,
} from "./org.schema";
import Session from "supertokens-node/recipe/session";
import { log } from "../../utils/logger";
import { getWebhookSecret } from "../../utils/webhook";
import { sendAWSEmail } from "../../utils/email/sendAWSEmail";

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

export async function deleteOrgHandler(
  request: FastifyRequest<{
    Params: { orgId: string };
  }>,
  reply: FastifyReply,
) {
  try {
    const deleteOrganization = await deleteOrg(request.params.orgId);
    reply.code(200).send(deleteOrganization);
  } catch (e) {
    console.error(e);
    reply.code(500).send({ success: false, message: e.message });
  }
}

export async function pauseOrgHandler(
  request: FastifyRequest<{ Body: PauseOrgInput; Params: IdParamInput }>,
  reply: FastifyReply,
) {
  try {
    const orgId = request.params.id;
    const res = await pauseOrg(orgId, request.body);
    reply.code(200).send(res);
  } catch (e) {
    console.error(e);
    reply.code(500).send(e);
  }
}

export async function getWebhookClientSecretHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    const secret = await getWebhookSecret(request.user.orgId);
    reply.code(200).send(secret);
  } catch (e) {
    log.error(e);
    reply.code(500).send(e);
  }
}

export interface OnBoarding {
  services: string[];
  industry: string;
  template: string;
  integration: string;
}

export async function completeOrgDetailsHandler(
  request: FastifyRequest<{
    Body: { onboarding?: OnBoarding };
  }>,
  reply: FastifyReply,
) {
  try {
    const userId = request.user.userId;
    const orgData = await completeOrgDetails(userId, {
      onboarding: request.body.onboarding,
      onboardingCompleted: true,
    });
    const tellUsMore = orgData.updatedOrg.onboarding;
    const emaildata = {
      to: process.env.ROOT_ORG_MAIL_ID ?? "hello@rateup.app",
      subject: `New RateUp SignUp: ${orgData.updatedOrg.name}`,
      text: `
New Organization "${orgData.updatedOrg.name}".

Details:
- Created At: ${orgData.updatedOrg.createdAt.toISOString()}
Onboarding:
- Services: ${(tellUsMore?.["services"] || []).join(", ")}
- Industry: ${tellUsMore?.["industry"]}
- Template: ${tellUsMore?.["template"]}
- Integration: ${tellUsMore?.["integration"]}
      `,
      html: `
      <h2>Organization Updated: ${orgData.updatedOrg.name}</h2>
      <p><strong>Created At:</strong> ${orgData.updatedOrg.createdAt.toISOString()}</p>
      <h3>Onboarding Details</h3>
      <ul>
        <li><strong>Services:</strong> ${(tellUsMore?.["services"] || []).join(", ")}</li>
        <li><strong>Industry:</strong> ${tellUsMore?.["industry"]}</li>
        <li><strong>Template:</strong> ${tellUsMore?.["template"]}</li>
        <li><strong>Integration:</strong> ${tellUsMore?.["integration"]}</li>
      </ul>
      `,
    };
    await sendAWSEmail(emaildata);
    reply.code(200).send(orgData);
  } catch (e) {
    reply.code(500).send(e);
  }
}

export async function orgNameAndPhoneNumber(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    const userId = request.user.userId;
    const updates = await getOrgNameAndUserPhone(userId);
    reply.code(200).send(updates);
  } catch (e) {
    reply.code(500).send(e);
  }
}
