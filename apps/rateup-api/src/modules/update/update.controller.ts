import { FastifyReply, FastifyRequest } from "fastify";
import { updateSubscriptionFeatures } from "./migrationFiles/subscription-update";
import { updateEditorStructure } from "./migrationFiles/editor-update";

export async function updateDatabase(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    console.log(".......Updating Database........");
    updateSubscriptionFeatures();
    reply.code(201).send("Database Updated Successfully");
  } catch (error) {
    reply.code(500).send(error);
  }
}

export async function updateSurveyEditor(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    console.log(".......Updating Survey Editor........");
    updateEditorStructure();
    reply.code(201).send("Survey Editor Updated Successfully");
  } catch (error) {
    reply.code(500).send(error);
  }
}

export async function testUpdateRoute(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    console.log(".......Update route testing........");
    reply.code(201).send("Hello World");
  } catch (error) {
    reply.code(500).send(error);
  }
}
