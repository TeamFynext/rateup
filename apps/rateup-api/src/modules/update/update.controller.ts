import { FastifyReply, FastifyRequest } from "fastify";
import { updateWebSurveyPagesThemeInDB } from "./migrationFiles/update-web-survey-pages-theme";
import { log } from "../../utils/logger";
import { createHubSpotContactsForExistingRecords } from "./migrationFiles/create-hubspot-contact";

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

export async function createHubSpotContactsForExistingUsers(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    const res = await createHubSpotContactsForExistingRecords();
    reply.code(200).send(res);
  } catch (e) {
    log.error("error creating hubspot contact for existing records %o", e);
    reply.code(500).send(e);
  }
}
