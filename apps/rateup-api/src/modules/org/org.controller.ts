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

export interface TellUsMore {
  "Business Name": string;
  "Business Type": string;
  "Team Size": string;
  Country: string;
  "Phone Number": string;
  "What is your role at your organization?": string;
  "Company Website": string;
  "Which platform do you actively use?": string;
  "Do you currently use any tools for engagement?": string;
  "What do you want to automate?": string[];
  "Are you interested in WhatsApp Loyalty, Web Survey Programs for your business?": string;
  "How did you hear about RateUp?": string;
  "Need help with onboarding, have a specific use case, or require custom features? Let us know below": string;
}

export async function completeOrgDetailsHandler(
  request: FastifyRequest<{
    Body: { orgName?: string; tellUsMore?: TellUsMore; phone: string };
  }>,
  reply: FastifyReply,
) {
  try {
    const userId = request.user.userId;
    const phone = request.body.phone;
    const orgData = await completeOrgDetails(userId, {
      tellUsMore: request.body.tellUsMore,
      isTellUsMoreCompleted: true,
    });
    const tellUsMore = orgData.updatedOrg.tellUsMore;
    const emaildata = {
      to: process.env.ROOT_ORG_MAIL_ID ?? "hello@rateup.app",
      subject: `New RateUp SignUp: ${orgData.updatedOrg.name}`,
      text: `
New Organization "${orgData.updatedOrg.name}".

Details:
- Created At: ${orgData.updatedOrg.createdAt.toISOString()}
- Phone: ${phone}

Tell Us More:
- Business Name: ${tellUsMore?.["Business Name"]}
- Business Type: ${tellUsMore?.["Business Type"]}
- Team Size: ${tellUsMore?.["Team Size"]}
- Country: ${tellUsMore?.["Country"]}
- Phone Number: ${tellUsMore?.["Phone Number"]}
- What is your role at your organization?: ${tellUsMore?.["What is your role at your organization?"]}
- Company Website: ${tellUsMore?.["Company Website"]}
- Which platform do you actively use?: ${tellUsMore?.["Which platform do you actively use?"]}
- Do you currently use any tools for engagement?: ${tellUsMore?.["Do you currently use any tools for engagement?"]}
- What do you want to automate?: ${(tellUsMore?.["What do you want to automate?"] || []).join(", ")}
- Are you interested in WhatsApp Loyalty, Web Survey Programs for your business?: ${tellUsMore?.["Are you interested in WhatsApp Loyalty, Web Survey Programs for your business?"]}
- How did you hear about RateUp?: ${tellUsMore?.["How did you hear about RateUp?"]}
- Need help with onboarding, have a specific use case, or require custom features? Let us know below: ${tellUsMore?.["Need help with onboarding, have a specific use case, or require custom features? Let us know below"]}
      `,
      html: `
      <h2>Organization Updated: ${orgData.updatedOrg.name}</h2>
      <p><strong>Created At:</strong> ${orgData.updatedOrg.createdAt.toISOString()}</p>
      <p><strong>Phone:</strong> ${phone}</p>
      <h3>Tell Us More</h3>
      <ul>
        <li><strong>Business Name:</strong> ${tellUsMore?.["Business Name"]}</li>
        <li><strong>Business Type:</strong> ${tellUsMore?.["Business Type"]}</li>
        <li><strong>Team Size:</strong> ${tellUsMore?.["Team Size"]}</li>
        <li><strong>Country:</strong> ${tellUsMore?.["Country"]}</li>
        <li><strong>Phone Number:</strong> ${tellUsMore?.["Phone Number"]}</li>
        <li><strong>What is your role at your organization?:</strong> ${tellUsMore?.["What is your role at your organization?"]}</li>
        <li><strong>Company Website:</strong> ${tellUsMore?.["Company Website"]}</li>
        <li><strong>Which platform do you actively use?:</strong> ${tellUsMore?.["Which platform do you actively use?"]}</li>
        <li><strong>Do you currently use any tools for engagement?:</strong> ${tellUsMore?.["Do you currently use any tools for engagement?"]}</li>
        <li><strong>What do you want to automate?:</strong> ${(tellUsMore?.["What do you want to automate?"] || []).join(", ")}</li>
        <li><strong>Are you interested in WhatsApp Loyalty, Web Survey Programs for your business?:</strong> ${tellUsMore?.["Are you interested in WhatsApp Loyalty, Web Survey Programs for your business?"]}</li>
        <li><strong>How did you hear about RateUp?:</strong> ${tellUsMore?.["How did you hear about RateUp?"]}</li>
        <li><strong>Need help with onboarding, have a specific use case, or require custom features? Let us know below:</strong> ${tellUsMore?.["Need help with onboarding, have a specific use case, or require custom features? Let us know below"]}</li>
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
