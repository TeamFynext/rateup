import { FastifyReply, FastifyRequest } from "fastify";
import { updateWebSurveyPagesThemeInDB } from "./migrationFiles/update-web-survey-pages-theme";
import { log } from "../../utils/logger";
import { updateFreePlanSubscriptionFeatures } from "./migrationFiles/update-free-plan-features";

export async function updateWebSurveyPagesTheme(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    const result = await updateWebSurveyPagesThemeInDB();
    reply.status(200).send({
      success: true,
      message: "update WebSurveyPagesTheme successfully.",
    });
  } catch (err) {
    reply.status(500).send({
      success: false,
      message: "Something went wrong while updating WebSurveyPagesTheme.",
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
