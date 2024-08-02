import { FastifyReply, FastifyRequest } from "fastify";
import { updateSubscriptionFeatures } from "./migrationFiles/subscription-update";
import { updateEditorStructure } from "./migrationFiles/editor-update";
import { updateSubscriptionFeatures2 } from "./migrationFiles/sub-update-2";
import { updateGoogleSheetToIntegration } from "./migrationFiles/integration-update";

export async function updateDatabase(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    console.log("Plz Wait....Pushing Database Update...");
    //updateSubscriptionFeatures();
    await updateSubscriptionFeatures2();
    console.log("--->  Successfully Completed Updations.");
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

export async function transferDataToIntegrationsHandler(
  request: FastifyRequest<{ Params: { app: string } }>,
  reply: FastifyReply,
) {
  try {
    const app = request.params.app;
    let res;
    if (app === "googlesheet") res = await updateGoogleSheetToIntegration();
    reply.code(200).send(res);
  } catch (e) {
    return reply.code(500).send({ error: "Something went wrong" });
  }
}
