import { FastifyReply, FastifyRequest } from "fastify";
import { updateGoogleReviewQuestionsInDB } from "./migrationFiles/update-google-review-questions";
import { log } from "../../utils/logger";
import { updateFreePlanSubscriptionFeatures } from "./migrationFiles/update-free-plan-features";

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

//update free plan subscription features in dev since it is missing
export async function updateFreePlanSubscriptionFeaturesHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    const res = await updateFreePlanSubscriptionFeatures();
    reply.code(200).send(res);
  } catch (e) {
    log.error(e);
    reply.code(500).send(e);
  }
}
