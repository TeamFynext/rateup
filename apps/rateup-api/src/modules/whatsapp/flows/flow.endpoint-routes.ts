import { FastifyInstance } from "fastify";
import fastifyRawBody from "fastify-raw-body";
import { handleFlowResponse } from "../encryption/wa_encryption.utils.js";

export async function flowEnpointRoutes(server: FastifyInstance) {
  // The endpoint verifies Meta's X-Hub-Signature-256 over the bytes exactly as
  // sent, so it needs the raw body — a re-serialized one would not hash the same.
  await server.register(fastifyRawBody, {
    field: "rawBody",
    global: false,
    encoding: "utf8",
    runFirst: true,
  });

  server.post("/:orgId/:dbFlowId", { config: { rawBody: true } }, handleFlowResponse);
}
