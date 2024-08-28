import { FastifyReply, FastifyRequest } from "fastify";
import { updatePageTypeQuestionsInDB } from "./migrationFiles/update-page-type-questions";
import { log } from "../../utils/logger";
import { createHubSpotContactsForExistingRecords } from "./migrationFiles/create-hubspot-contact";

export async function updatePageTypeQuestions(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    const result = await updatePageTypeQuestionsInDB();
    reply.status(200).send({
      success: true,
      message: "update questions successfully.",
    });
  } catch (err) {
    reply.status(500).send({
      success: false,
      message: "Something went wrong while updating questions.",
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
