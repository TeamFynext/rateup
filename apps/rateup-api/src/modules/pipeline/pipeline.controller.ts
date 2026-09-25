import { FastifyReply, FastifyRequest } from "fastify";
import {
  createLabel,
  createLostReason,
  createPipeline,
  deleteLabel,
  deleteLostReason,
  deletePipeline,
  getPipelineById,
  getPipelineMembers,
  getTeamPipelineDefaults,
  updateTeamPipelineDefault,
  getPipelines,
  LeadsPipelineExistsError,
  PipelineLimitError,
  TeamAccessError,
  updateLabel,
  updateLostReason,
  updatePipeline,
} from "./pipeline.service.js";
import { getPipelineStats } from "./pipeline.stats.js";
import { getPipelineForecast } from "./pipeline.forecast.js";
import { dataExtractFileMimeTypes } from "../fileUpload/fileUpload.schema.js";
import {
  buildImportTemplate,
  importLeads,
  LeadImportFileError,
} from "./pipelineLead/lead.import.js";
import type {
  CreateLabelRequestSchema,
  CreateLostReasonRequestSchema,
  CreatePipelineRequestSchema,
  UpdateLabelRequestSchema,
  UpdateLostReasonRequestSchema,
  UpdatePipelineRequestSchema,
  UpdateTeamDefaultRequestSchema,
  ImportTemplateQuerySchema,
} from "./pipeline.schema.js";

export async function createPipelineHandler(
  request: FastifyRequest<{ Body: CreatePipelineRequestSchema }>,
  reply: FastifyReply,
) {
  try {
    const pipeline = await createPipeline({
      ...request.body,
      orgId: request.user.orgId,
      userId: request.userId,
      actor: request.actor!,
    });
    return reply.code(201).send(pipeline);
  } catch (error) {
    if (error instanceof TeamAccessError) {
      return reply.code(403).send({ message: error.message, teamIds: error.teamIds });
    }
    if (error instanceof PipelineLimitError) {
      return reply.code(409).send({ message: error.message, limit: error.limit });
    }
    if (error instanceof LeadsPipelineExistsError) {
      return reply.code(409).send({ message: error.message, code: "leads_exists" });
    }
    request.log.error(error);
    return reply.code(500).send({ message: "Error creating pipeline" });
  }
}

export async function getPipelinesHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const pipelines = await getPipelines(request.actor!, request.user.orgId);
    return reply.code(200).send(pipelines);
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({ message: "Error retrieving pipelines" });
  }
}

export async function getPipelineHandler(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  try {
    const pipeline = await getPipelineById(request.params.id);
    if (!pipeline) {
      return reply.code(404).send({ message: "Pipeline not found" });
    }
    return reply.code(200).send(pipeline);
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({ message: "Error retrieving pipeline" });
  }
}

export async function updatePipelineHandler(
  request: FastifyRequest<{ Params: { id: string }; Body: UpdatePipelineRequestSchema }>,
  reply: FastifyReply,
) {
  try {
    const pipeline = await updatePipeline(request.params.id, request.body, request.actor!);
    return reply.code(200).send(pipeline);
  } catch (error) {
    if (error instanceof TeamAccessError) {
      return reply.code(403).send({ message: error.message, teamIds: error.teamIds });
    }
    request.log.error(error);
    return reply.code(500).send({ message: "Error updating pipeline" });
  }
}

export async function deletePipelineHandler(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  try {
    await deletePipeline(request.params.id);
    return reply.code(204).send();
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({ message: "Error deleting pipeline" });
  }
}

export async function getPipelineStatsHandler(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  try {
    const stats = await getPipelineStats(request.params.id, request.userId);
    return reply.code(200).send(stats);
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({ message: "Error retrieving pipeline stats" });
  }
}

export async function getPipelineForecastHandler(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  try {
    const buckets = await getPipelineForecast(request.params.id);
    return reply.code(200).send(buckets);
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({ message: "Error retrieving pipeline forecast" });
  }
}

export async function getPipelineMembersHandler(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  try {
    const members = await getPipelineMembers(request.params.id);
    return reply.code(200).send(members);
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({ message: "Error retrieving pipeline members" });
  }
}

export async function getTeamPipelineDefaultsHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const teams = await getTeamPipelineDefaults(request.user.orgId);
    return reply.code(200).send(teams);
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({ message: "Error retrieving team pipelines" });
  }
}

export async function updateTeamPipelineDefaultHandler(
  request: FastifyRequest<{
    Params: { teamId: string };
    Body: UpdateTeamDefaultRequestSchema;
  }>,
  reply: FastifyReply,
) {
  try {
    const team = await updateTeamPipelineDefault(
      request.params.teamId,
      request.user.orgId,
      request.body,
    );
    return reply.code(200).send(team);
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({ message: "Error updating the team's pipeline" });
  }
}

export async function createLostReasonHandler(
  request: FastifyRequest<{ Params: { id: string }; Body: CreateLostReasonRequestSchema }>,
  reply: FastifyReply,
) {
  try {
    const reason = await createLostReason(request.params.id, request.body);
    return reply.code(201).send(reason);
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({ message: "Error creating lost reason" });
  }
}

export async function updateLostReasonHandler(
  request: FastifyRequest<{ Params: { id: string }; Body: UpdateLostReasonRequestSchema }>,
  reply: FastifyReply,
) {
  try {
    const reason = await updateLostReason(request.params.id, request.body);
    return reply.code(200).send(reason);
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({ message: "Error updating lost reason" });
  }
}

export async function deleteLostReasonHandler(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  try {
    await deleteLostReason(request.params.id);
    return reply.code(204).send();
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({ message: "Error deleting lost reason" });
  }
}

export async function createLabelHandler(
  request: FastifyRequest<{ Params: { id: string }; Body: CreateLabelRequestSchema }>,
  reply: FastifyReply,
) {
  try {
    const label = await createLabel(request.params.id, request.body);
    return reply.code(201).send(label);
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({ message: "Error creating label" });
  }
}

export async function updateLabelHandler(
  request: FastifyRequest<{ Params: { id: string }; Body: UpdateLabelRequestSchema }>,
  reply: FastifyReply,
) {
  try {
    const label = await updateLabel(request.params.id, request.body);
    return reply.code(200).send(label);
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({ message: "Error updating label" });
  }
}

export async function deleteLabelHandler(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  try {
    await deleteLabel(request.params.id);
    return reply.code(204).send();
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({ message: "Error deleting label" });
  }
}

export async function importLeadsHandler(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  try {
    const file = await request.file();
    if (!file) return reply.code(400).send({ message: "No file uploaded", code: "NO_FILE" });
    if (!dataExtractFileMimeTypes.includes(file.mimetype)) {
      return reply.code(400).send({ message: "Upload a CSV or Excel file", code: "BAD_TYPE" });
    }
    const result = await importLeads({
      pipelineId: request.params.id,
      userId: request.userId,
      buffer: await file.toBuffer(),
      mimetype: file.mimetype,
    });
    return reply.code(200).send(result);
  } catch (error) {
    if (error instanceof LeadImportFileError) {
      return reply.code(400).send({ message: error.message, code: error.code });
    }
    if ((error as { code?: string }).code === "FST_REQ_FILE_TOO_LARGE") {
      return reply.code(413).send({ message: "The file is larger than 10 MB", code: "TOO_LARGE" });
    }
    request.log.error(error);
    return reply.code(500).send({ message: "Error importing leads" });
  }
}

export async function importTemplateHandler(
  request: FastifyRequest<{ Params: { id: string }; Querystring: ImportTemplateQuerySchema }>,
  reply: FastifyReply,
) {
  try {
    const format = request.query.format;
    const body = await buildImportTemplate(request.params.id, format);
    reply.header(
      "Content-Type",
      format === "csv"
        ? "text/csv; charset=utf-8"
        : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    reply.header("Content-Disposition", `attachment; filename="pipeline-import.${format}"`);
    return reply.send(body);
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({ message: "Error building the import template" });
  }
}
