import { FastifyReply, FastifyRequest } from "fastify";
import { log } from "../../utils/logger";
import { LabelBodySchema, LabelIdParamSchema } from "./label.schema";
import {
  createLabel,
  deleteLabelById,
  getLabels,
  updateLabel,
} from "./label.service";

export async function getLabelsHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    const { orgId } = request.user;
    const res = await getLabels(orgId);
    reply.code(200).send(res);
  } catch (e) {
    log.error(e);
    reply.code(500).send({ message: "Error getting label " });
  }
}
export async function createLabelHandler(
  request: FastifyRequest<{
    Body: LabelBodySchema;
  }>,
  reply: FastifyReply,
) {
  try {
    const { orgId } = request.user;
    const res = await createLabel(orgId, request.body);
    reply.code(200).send(res);
  } catch (e) {
    if (e.code === "P2002") {
      return reply.code(409).send({ message: "Label already exists" });
    }
    log.error(e);
    reply.code(500).send({ message: "Error creating label" });
  }
}

export async function updateLabelHandler(
  request: FastifyRequest<{
    Body: LabelBodySchema;
    Params: { labelId: string };
  }>,
  reply: FastifyReply,
) {
  try {
    const id = request.params.labelId;
    const res = await updateLabel(id, request.body);
    reply.code(200).send(res);
  } catch (e) {
    if (e.code === "P2002") {
      return reply.code(409).send({ message: "Label already exists" });
    }
    log.error(e);
    reply.code(500).send({ message: "Error updating label " });
  }
}

export async function deleteLabelByIdHandler(
  request: FastifyRequest<{ Params: LabelIdParamSchema }>,
  reply: FastifyReply,
) {
  try {
    const { labelId } = request.params;
    const res = await deleteLabelById(labelId);
    reply.code(200).send(res);
  } catch (e) {
    log.error(e);
    reply.code(500).send({ message: "Error deleting label" });
  }
}
