import type { FastifyRequest } from "fastify";
import { z } from "zod";
import prisma from "../../../utils/prisma.js";
import { createReferral } from "../../referrals/referrals.service.js";
import { generateResponse } from "../../response/response.service.js";
import { generateInboxResponse } from "../../whatsapp/inbox/message/wamessage.service.js";
import { reasonSchema } from "../orgs/subscription.schema.js";
import { StaffHttpError } from "../staff.errors.js";
import { recordStaffAction } from "../staffAudit.js";

export const reasonBodySchema = z.object({ reason: reasonSchema });
export type ReasonBody = z.infer<typeof reasonBodySchema>;

export const referralCreateSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.email().max(254),
  reason: reasonSchema,
});
export type ReferralCreateInput = z.infer<typeof referralCreateSchema>;

export async function addReferral(request: FastifyRequest, input: ReferralCreateInput) {
  // The code is generated from the name and made unique by the service; nothing to
  // pre-check here.
  const referral = await createReferral(input.name, input.email);
  await recordStaffAction(prisma, request, {
    action: "referral.create",
    reason: input.reason,
    after: { id: referral.id, code: referral.referral_code, name: referral.name },
  });
  return referral;
}

/** The totals go on the audit row: once the row is gone they are nowhere else. */
export async function removeReferral(request: FastifyRequest, id: string, input: ReasonBody) {
  const existing = await prisma.referral.findUnique({ where: { id } });
  if (!existing) throw new StaffHttpError(404, "REFERRAL_NOT_FOUND", "No such referral.");
  return prisma.$transaction(async (tx) => {
    await tx.referral.delete({ where: { id } });
    await recordStaffAction(tx, request, {
      action: "referral.delete",
      reason: input.reason,
      before: {
        code: existing.referral_code,
        name: existing.name,
        email: existing.email,
        visits: existing.visit_count,
        signups: existing.signup_count,
      },
    });
    return { deleted: true };
  });
}

/**
 * Removes a store's integration row. The store itself is untouched: if the merchant still
 * has the app installed, its next webhook or session refresh recreates the row. What this
 * clears is a stale or duplicated link.
 */
export async function removeShopifyIntegration(
  request: FastifyRequest,
  id: string,
  input: ReasonBody,
) {
  const existing = await prisma.integration.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      orgId: true,
      credential: true,
      org: { select: { name: true } },
    },
  });
  if (!existing || existing.name !== "shopify") {
    throw new StaffHttpError(404, "INTEGRATION_NOT_FOUND", "No such Shopify integration.");
  }
  const shop = (existing.credential as { session?: { shop?: string } } | null)?.session?.shop;
  return prisma.$transaction(async (tx) => {
    await tx.integration.delete({ where: { id } });
    await recordStaffAction(tx, request, {
      action: "shopify.unlink",
      reason: input.reason,
      targetOrgId: existing.orgId ?? undefined,
      targetOrgName: existing.org?.name,
      // Only the shop domain: the credential holds the store's access token.
      before: { shop },
    });
    return { deleted: true };
  });
}

/* Test data. Never in production: the responses are fake and the inbox generator sends
 * real WhatsApp messages to real contacts through the org's own number. */

function assertNotProduction() {
  if (process.env.NODE_ENV === "production") {
    throw new StaffHttpError(
      403,
      "NOT_IN_PRODUCTION",
      "Test data cannot be generated in production.",
    );
  }
}

export const testDataOrgQuerySchema = z.object({ orgId: z.uuid() });
export type TestDataOrgQuery = z.infer<typeof testDataOrgQuerySchema>;

/** The surveys of one org, per team, to pick where fake responses go. */
export async function listSurveyTargets(orgId: string) {
  const maps = await prisma.surveyTeamMap.findMany({
    where: { survey: { orgId }, team: { orgId } },
    select: {
      id: true,
      survey: { select: { id: true, title: true, type: true } },
      team: { select: { id: true, name: true } },
      _count: { select: { responses: true } },
    },
    orderBy: [{ survey: { title: "asc" } }, { team: { name: "asc" } }],
  });
  return maps.map((map) => ({
    id: map.id,
    survey: map.survey,
    team: map.team,
    responses: map._count.responses,
  }));
}

export const fakeResponsesSchema = z.object({
  surveyTeamMapId: z.uuid(),
  batchSize: z.number().int().min(1).max(500),
  reason: reasonSchema,
});
export type FakeResponsesInput = z.infer<typeof fakeResponsesSchema>;

export async function addFakeResponses(request: FastifyRequest, input: FakeResponsesInput) {
  assertNotProduction();
  const map = await prisma.surveyTeamMap.findUnique({
    where: { id: input.surveyTeamMapId },
    select: { survey: { select: { title: true, orgId: true } }, team: { select: { name: true } } },
  });
  if (!map) throw new StaffHttpError(404, "SURVEY_NOT_FOUND", "No such survey and team.");
  const rows = await generateResponse({
    surveyTeamMapId: input.surveyTeamMapId,
    batchSize: input.batchSize,
  });
  await recordStaffAction(prisma, request, {
    action: "testdata.responses",
    reason: input.reason,
    targetOrgId: map.survey.orgId ?? undefined,
    after: { survey: map.survey.title, team: map.team.name, generated: rows.length },
  });
  return { generated: rows.length };
}

export const fakeInboxSchema = z.object({
  orgId: z.uuid(),
  numberOfContacts: z.number().int().min(1).max(50),
  messagesPerContact: z.number().int().min(1).max(20),
  reason: reasonSchema,
});
export type FakeInboxInput = z.infer<typeof fakeInboxSchema>;

export async function addFakeInboxChats(request: FastifyRequest, input: FakeInboxInput) {
  assertNotProduction();
  const org = await prisma.org.findUnique({
    where: { id: input.orgId },
    select: { id: true, name: true },
  });
  if (!org) throw new StaffHttpError(404, "ORG_NOT_FOUND", "Organisation not found.");
  try {
    await generateInboxResponse(
      { numberOfContacts: input.numberOfContacts, messagesPerContact: input.messagesPerContact },
      org.id,
      request.staff!.id,
    );
  } catch (err) {
    throw new StaffHttpError(
      422,
      "GENERATE_FAILED",
      err instanceof Error ? err.message : "Could not generate chats.",
    );
  }
  await recordStaffAction(prisma, request, {
    action: "testdata.inbox",
    reason: input.reason,
    targetOrgId: org.id,
    targetOrgName: org.name,
    after: { contacts: input.numberOfContacts, messagesPerContact: input.messagesPerContact },
  });
  return { queued: input.numberOfContacts * input.messagesPerContact };
}
