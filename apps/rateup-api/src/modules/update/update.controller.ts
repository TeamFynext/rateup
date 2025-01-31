import { FastifyReply, FastifyRequest } from "fastify";
import { updateGoogleReviewQuestionsInDB } from "./migrationFiles/update-google-review-questions";
import { log } from "../../utils/logger";
import { updateWebSurveyPagesThemeTitle } from "./migrationFiles/update-theme-title";
import { updateUsageStatsReset } from "./migrationFiles/update-usage-stats";
import { campaignStatsUpdate } from "./migrationFiles/CampaignStatsUpdate";
import prisma from "../../utils/prisma";

export async function updateGoogleReviewQuestions(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    const result = await updateGoogleReviewQuestionsInDB();
    reply.status(200).send({
      success: true,
      message: "update GoogleReviewQuestions successfully.",
    });
  } catch (err) {
    reply.status(500).send({
      success: false,
      message: "Something went wrong while updating GoogleReviewQuestions.",
    });
  }
}

export async function updateWebSurveyThemePageTitleHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    await updateWebSurveyPagesThemeTitle();
    reply.code(200).send("success");
  } catch (e) {
    log.error(e);
    reply.code(500).send(e);
  }
}

export async function updateUsageStatsResetHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    await updateUsageStatsReset();
    reply.code(200).send("success");
  } catch (e) {
    log.error(e);
    reply.code(500).send(e);
  }
}

export async function campaignStatsChangeHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    await campaignStatsUpdate();
    reply.code(200).send("success");
  } catch (e) {
    log.error(e);
    reply.code(500).send(e);
  }
}

export async function getMessageHandler(
  request: FastifyRequest<{
    Params: { id: string };
    Querystring: { limit: number; offset: number };
  }>,
  reply: FastifyReply,
) {
  try {
    const orgId = request.params.id;
    const messages =
      await prisma.$queryRaw`SELECT wm."id", wm."messageBody", wm."createdAt" FROM "WaMessage" wm 
      JOIN "Contact" c ON wm."contactId" = c.id 
      JOIN "Subscription" s ON c."orgId" = s."orgId"
      WHERE wm."messageBody"->>'send' IS NOT NULL
      AND wm."createdAt" >= COALESCE(s."renewedAt", s."createdAt")
      AND c."orgId" = ${orgId}::uuid ORDER BY wm."createdAt" LIMIT ${BigInt(request.query.limit)} OFFSET ${BigInt(request.query.offset)};`;

    const count = await prisma.$queryRaw`SELECT COUNT(*) FROM "WaMessage" wm 
      JOIN "Contact" c ON wm."contactId" = c.id 
      JOIN "Subscription" s ON c."orgId" = s."orgId"
      WHERE wm."messageBody"->>'send' IS NOT NULL
      AND wm."createdAt" >= COALESCE(s."renewedAt", s."createdAt")
      AND c."orgId" = ${orgId}::uuid;`;

    reply.code(200).send({ messages, count: Number(count[0].count) });
  } catch (e) {
    log.error(e);
    reply.code(500).send(e);
  }
}
