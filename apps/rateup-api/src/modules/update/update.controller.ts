import { FastifyReply, FastifyRequest } from "fastify";
import { updateGoogleReviewQuestionsInDB } from "./migrationFiles/update-google-review-questions";
import { log } from "../../utils/logger";
import { updateWebSurveyPagesThemeTitle } from "./migrationFiles/update-theme-title";
import { updateLoyaltySubscription } from "./migrationFiles/update-loyalty-subscription";
import { campaignStatsUpdate } from "./migrationFiles/CampaignStatsUpdate";

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

export async function updateLoyaltySubscriptionHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    await updateLoyaltySubscription();
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
