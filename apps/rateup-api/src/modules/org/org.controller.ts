import { FastifyReply, FastifyRequest } from "fastify";
import {
  completeOrgDetails,
  createOrg,
  deleteOrg,
  getAllMembersWithTeams,
  getAllMembersWithTeamsAndInvitation,
  getAllOrgs,
  getOnboardingChecklist,
  getOrgById,
  getOrgNameAndUserPhone,
  getOrgStats,
  getTeamsMembers,
  pauseOrg,
  sendDeletionMailToOrgOwner,
  updateOrgDetails,
  updateOrgLogo,
  updateOrgUserRole,
} from "./org.services.js";
import {
  ByOrgIdParams,
  CreateOrgInput,
  IdParamInput,
  PauseOrgInput,
  UpdateLogoInput,
  UpdateOrgDetailsInput,
  UpdateRoleInput,
} from "./org.schema.js";
import Session from "supertokens-node/recipe/session/index.js";
import { log } from "../../utils/logger.js";
import { getWebhookSecret } from "../../utils/webhook.js";
import { getUserByEmail } from "../user/user.service.js";
import { notificationQueue } from "../../utils/redisConnection.js";
import { errorMessage } from "../../utils/commonUtils.js";
import { isRootOrg } from "../../utils/auth.js";

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
  } catch (e) {
    // TODO
    console.error(e);

    reply.code(500).send({ error: errorMessage(e) });
  }
}

export async function getAllTeamsAndMembers(request: FastifyRequest, reply: FastifyReply) {
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

export async function getAllMembersWithTeamsHandler(request: FastifyRequest, reply: FastifyReply) {
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

export async function getAllMembersWithTeamsAndInvitationHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    let session = await Session.getSession(request, reply);

    const accessTokenPayload = session.getAccessTokenPayload();
    const orgId = accessTokenPayload.orgId;

    const teamsMembers = await getAllMembersWithTeamsAndInvitation(orgId);

    reply.send({ message: `Success`, data: teamsMembers });
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
    roleUpdate = await updateOrgUserRole(body as { role: string }, id, request, reply);

    // Check if the roleUpdate is an error message
    if (typeof roleUpdate === "string") {
      reply.code(400).send({ success: false, message: roleUpdate });
      return;
    }
  } catch (e) {
    console.error(e);
    reply.code(500).send({ success: false, message: errorMessage(e) });
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
  let _user;

  try {
    _user = await updateOrgLogo(body, request, reply);
  } catch (e) {
    console.error(e);
    reply.code(500).send({ success: false, message: errorMessage(e) });
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
    await updateOrgDetails(body, request, reply);
  } catch (e) {
    console.error(e);
    reply.code(500).send({ success: false, message: errorMessage(e) });
    return;
  }

  reply.code(201).send({ success: true, data: "Logo Updated..!" });
}

export async function getAllOrgsHandler(_: FastifyRequest, reply: FastifyReply) {
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

// Self-service deletion. The route's only gate is
// checkRoleHandler(["SUPER_ADMIN"]), which establishes that the caller is an
// owner — of their OWN organisation; it never compares organisations. So taking
// the id from the path let the owner of any org delete any other org by naming
// its id, and org ids are not secret. The org is now the session's, and a path
// id naming someone else is refused rather than quietly ignored so a
// mis-pointed client fails loudly. The platform operator keeps
// DELETE /admin/:orgId, which is gated on assertRootOrg. See issues.txt 41.1.
export async function deleteOrgHandler(
  request: FastifyRequest<{
    Params: { orgId: string };
  }>,
  reply: FastifyReply,
) {
  const sessionOrgId = request.user?.orgId;
  if (!sessionOrgId) {
    reply.code(401).send({ success: false, message: "Not authorized" });
    return;
  }
  if (request.params.orgId !== sessionOrgId) {
    reply.code(403).send({
      success: false,
      message: "You can only delete your own organization",
    });
    return;
  }
  await runDeleteOrg(sessionOrgId, reply);
}

// The platform-operator twin, behind assertRootOrg — this one is meant to name
// an arbitrary organisation.
export async function deleteOrgAdminHandler(
  request: FastifyRequest<{
    Params: { orgId: string };
  }>,
  reply: FastifyReply,
) {
  await runDeleteOrg(request.params.orgId, reply);
}

async function runDeleteOrg(orgId: string, reply: FastifyReply) {
  try {
    const deleteOrganization = await deleteOrg(orgId);
    reply.code(200).send(deleteOrganization);
  } catch (e) {
    log.error({ err: e, orgId }, "Failed to delete org");
    reply.code(500).send({ success: false, message: e instanceof Error ? e.message : String(e) });
  }
}

// Same shape as 41.1: the role check says "an owner", not "an owner of THIS
// org", so a path id let any SUPER_ADMIN suspend any organisation on the
// platform — a full service interruption for that tenant's staff and its
// customer-facing surveys. The org is now the session's, with the root org kept
// as the platform-operator escape hatch since there is no /admin twin here.
// See issues.txt 41.2.
export async function pauseOrgHandler(
  request: FastifyRequest<{ Body: PauseOrgInput; Params: IdParamInput }>,
  reply: FastifyReply,
) {
  try {
    const sessionOrgId = request.user?.orgId;
    if (!sessionOrgId) {
      reply.code(401).send({ success: false, message: "Not authorized" });
      return;
    }
    if (request.params.id !== sessionOrgId && !isRootOrg(request)) {
      reply.code(403).send({
        success: false,
        message: "You can only pause your own organization",
      });
      return;
    }
    const res = await pauseOrg(request.params.id, request.body);
    reply.code(200).send(res);
  } catch (e) {
    log.error({ err: e, orgId: request.params.id }, "Failed to pause org");
    reply.code(500).send(e);
  }
}

export async function getWebhookClientSecretHandler(request: FastifyRequest, reply: FastifyReply) {
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
  // Stored as-is into the `onboarding` Json column, which callers extend freely.
  [field: string]: unknown;
}

export async function completeOrgDetailsHandler(
  request: FastifyRequest<{
    Body: { onboarding?: OnBoarding };
  }>,
  reply: FastifyReply,
) {
  try {
    const userId = request.user.userId;
    const email = request.user.email;
    if (!userId || !email) {
      return reply.code(401).send({ error: "User not authenticated" });
    }
    const user = await getUserByEmail(email);
    const orgData = await completeOrgDetails(userId, {
      onboarding: request.body.onboarding,
      onboardingCompleted: true,
    });
    // `onboarding` is a raw Json? column (see Org.onboarding in schema.prisma) with no
    // static shape — the fields read below are the ones this handler itself just wrote
    // via `request.body.onboarding: OnBoarding`, so this narrows a genuinely dynamic
    // JSON blob to the shape this code knows it produced.
    const tellUsMore = orgData.updatedOrg.onboarding as Partial<OnBoarding> | null | undefined;
    const emaildata = {
      to: process.env.ROOT_ORG_MAIL_ID ?? "hello@rateup.app",
      subject: `New RateUp SignUp: ${orgData.updatedOrg.name}`,
      text: `
New Organization "${orgData.updatedOrg.name}".

Details:
-Name : ${user?.name}
-Email: ${user?.email}
-Phone : ${orgData?.updatedOrg?.phone}
Onboarding Questionnaire:
- Services: ${(tellUsMore?.["services"] || []).join(", ")}
- Industry: ${tellUsMore?.["industry"]}
- Integration: ${tellUsMore?.["integration"] || "No Integration selected"}
      `,
      html: `
      <h2>New Organization: ${orgData.updatedOrg.name}</h2>
      <h3>Name: ${user?.name}</h3>
      <h3>Email: ${user?.email}</h3>
      <h3>Phone: ${orgData?.updatedOrg?.phone}</h3>
      <h3>Onboarding Questionnaire</h3>
      <ul>
        <li><strong>Services:</strong> ${(tellUsMore?.["services"] || []).join(", ")}</li>
        <li><strong>Industry:</strong> ${tellUsMore?.["industry"]}</li>
        <li><strong>Integration:</strong> ${tellUsMore?.["integration"] || "No Integration selected"}</li>
      </ul>
      `,
    };
    await notificationQueue.add("notification", {
      emailData: emaildata,
    });
    reply.code(200).send(orgData);
  } catch (e) {
    reply.code(500).send(e);
  }
}

export async function orgNameAndPhoneNumber(request: FastifyRequest, reply: FastifyReply) {
  try {
    const userId = request.user.userId;
    if (!userId) {
      return reply.code(401).send({ error: "User not authenticated" });
    }
    const updates = await getOrgNameAndUserPhone(userId);
    reply.code(200).send(updates);
  } catch (e) {
    reply.code(500).send(e);
  }
}

export async function getOnboardingChecklistHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    let session = await Session.getSession(request, reply);
    const accessTokenPayload = session.getAccessTokenPayload();
    const orgId = accessTokenPayload.orgId;
    const data = await getOnboardingChecklist(orgId);
    reply.code(200).send(data);
  } catch (e) {
    reply.code(500).send(e);
  }
}

export async function sendDeletionWarningHandler(
  request: FastifyRequest<{
    Params: ByOrgIdParams;
  }>,
  reply: FastifyReply,
) {
  try {
    const { orgId } = request.params;

    const org = await getOrgById(orgId);

    if (!org || !org.owner) {
      return reply.code(404).send({
        error: "Organization or owner not found",
      });
    }

    await sendDeletionMailToOrgOwner({
      ownerEmail: org.owner.email,
      ownerName: org.owner.name,
      orgName: org.name,
      orgId,
      delayInDays: 7,
    });

    return reply.code(200).send({
      message: "Deletion warning email scheduled successfully",
    });
  } catch (e) {
    request.log.error(e);
    return reply.code(500).send({
      error: "Failed to schedule deletion warning",
    });
  }
}
