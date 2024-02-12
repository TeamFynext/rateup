import { FastifyInstance } from "fastify";
import { handleFlowResponse } from "../encryption/wa_encryption.utils";

export async function flowEnpointRoutes(server: FastifyInstance) {
  server.post("/:orgId/:dbFlowId", handleFlowResponse);
}
