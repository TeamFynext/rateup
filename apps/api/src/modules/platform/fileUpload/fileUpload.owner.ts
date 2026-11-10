import type { FastifyReply, FastifyRequest } from "fastify";
import type { MultipartFile } from "@fastify/multipart";
import Session from "supertokens-node/recipe/session/index.js";
import prisma from "../../../utils/prisma.js";
import { getOrgIdAndRole } from "../../settings/user/user.service.js";
import { getMultipartFieldValue } from "../../../utils/upload/validate.js";

/**
 * Who an upload belongs to. Every object is keyed `<orgId>/…`, which is what lets the
 * delete route refuse a key outside the caller's org.
 *
 * - A signed-in dashboard/app user uploads for their session's org.
 * - An anonymous respondent (an image, file or testimonial-photo question on a public
 *   form) must name the form link they are answering in a `surveyTeamMapId` field that
 *   precedes the file part; the upload is keyed under that form's org, and only an
 *   active form accepts uploads.
 */
export interface UploadOwner {
  orgId: string;
  anonymous: boolean;
}

export class UploadOwnerError extends Error {
  constructor(
    readonly statusCode: 400 | 401 | 403 | 404,
    message: string,
  ) {
    super(message);
    this.name = "UploadOwnerError";
  }
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SHORT_ID = /^[A-Za-z0-9_-]{8}$/;

/** The org of the signed-in caller, or null when the request carries no session. */
export async function sessionOrgId(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<string | null> {
  // An expired access token throws TRY_REFRESH_TOKEN here and SuperTokens' error handler
  // answers 401, so the client refreshes and retries instead of silently going anonymous.
  const session = await Session.getSession(request, reply, { sessionRequired: false });
  if (!session) return null;
  const payload = session.getAccessTokenPayload() as { orgId?: string };
  if (payload.orgId) return payload.orgId;
  const member = await getOrgIdAndRole({ id: session.getUserId() });
  return member?.orgId ?? null;
}

export async function resolveUploadOwner(
  request: FastifyRequest,
  reply: FastifyReply,
  part: Pick<MultipartFile, "fields">,
): Promise<UploadOwner> {
  const orgId = await sessionOrgId(request, reply);
  if (orgId) return { orgId, anonymous: false };

  const link = getMultipartFieldValue(part.fields?.surveyTeamMapId);
  if (typeof link !== "string" || !(UUID.test(link) || SHORT_ID.test(link))) {
    throw new UploadOwnerError(401, "Sign in, or upload from a survey form.");
  }
  const surveyTeamMap = await prisma.surveyTeamMap.findUnique({
    where: UUID.test(link) ? { id: link } : { shortUrlId: link },
    select: { team: { select: { orgId: true } }, survey: { select: { active: true } } },
  });
  if (!surveyTeamMap) throw new UploadOwnerError(404, "Survey not found.");
  if (!surveyTeamMap.survey.active) {
    throw new UploadOwnerError(403, "This survey is not accepting responses.");
  }
  return { orgId: surveyTeamMap.team.orgId, anonymous: true };
}
