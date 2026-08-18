import { FastifyReply, FastifyRequest } from "fastify";
import {
  bulkUpdateLeads,
  closeLead,
  createLead,
  createNote,
  createTask,
  deleteLead,
  deleteNote,
  deleteTask,
  getLeadById,
  getLeads,
  moveLead,
  reopenLead,
  updateLead,
  updateTask,
} from "./lead.service.js";
import type {
  BulkUpdateLeadsRequestSchema,
  CloseLeadRequestSchema,
  CreateLeadRequestSchema,
  CreateNoteRequestSchema,
  CreateTaskRequestSchema,
  UpdateLeadRequestSchema,
  UpdateTaskRequestSchema,
} from "./lead.schema.js";

export async function getLeadsHandler(
  request: FastifyRequest<{ Querystring: { pipelineId: string } }>,
  reply: FastifyReply,
) {
  try {
    const leads = await getLeads(request.query.pipelineId);
    return reply.code(200).send(leads);
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({ message: "Error retrieving leads" });
  }
}

export async function getLeadHandler(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  try {
    const lead = await getLeadById(request.params.id);
    if (!lead) {
      return reply.code(404).send({ message: "Lead not found" });
    }
    return reply.code(200).send(lead);
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({ message: "Error retrieving lead" });
  }
}

export async function createLeadHandler(
  request: FastifyRequest<{ Body: CreateLeadRequestSchema }>,
  reply: FastifyReply,
) {
  try {
    const lead = await createLead({ ...request.body, userId: request.userId });
    return reply.code(201).send(lead);
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({ message: "Error creating lead" });
  }
}

export async function updateLeadHandler(
  request: FastifyRequest<{ Params: { id: string }; Body: UpdateLeadRequestSchema }>,
  reply: FastifyReply,
) {
  try {
    const lead = await updateLead(request.params.id, request.body, request.userId);
    return reply.code(200).send(lead);
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({ message: "Error updating lead" });
  }
}

export async function moveLeadHandler(
  request: FastifyRequest<{ Params: { id: string }; Body: { stageId: string } }>,
  reply: FastifyReply,
) {
  try {
    const lead = await moveLead(request.params.id, request.body.stageId, request.userId);
    return reply.code(200).send(lead);
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({ message: "Error moving lead" });
  }
}

export async function closeLeadHandler(
  request: FastifyRequest<{ Params: { id: string }; Body: CloseLeadRequestSchema }>,
  reply: FastifyReply,
) {
  try {
    const lead = await closeLead(request.params.id, request.body, request.userId);
    return reply.code(200).send(lead);
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({ message: "Error closing lead" });
  }
}

export async function reopenLeadHandler(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  try {
    const lead = await reopenLead(request.params.id, request.userId);
    return reply.code(200).send(lead);
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({ message: "Error reopening lead" });
  }
}

export async function deleteLeadHandler(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  try {
    await deleteLead(request.params.id);
    return reply.code(204).send();
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({ message: "Error deleting lead" });
  }
}

export async function bulkUpdateLeadsHandler(
  request: FastifyRequest<{ Body: BulkUpdateLeadsRequestSchema }>,
  reply: FastifyReply,
) {
  try {
    const leads = await bulkUpdateLeads(request.body, request.userId);
    return reply.code(200).send(leads);
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({ message: "Error updating leads" });
  }
}

export async function createNoteHandler(
  request: FastifyRequest<{ Params: { id: string }; Body: CreateNoteRequestSchema }>,
  reply: FastifyReply,
) {
  try {
    const note = await createNote(request.params.id, request.body, request.userId);
    return reply.code(201).send(note);
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({ message: "Error creating note" });
  }
}

export async function deleteNoteHandler(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  try {
    await deleteNote(request.params.id);
    return reply.code(204).send();
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({ message: "Error deleting note" });
  }
}

export async function createTaskHandler(
  request: FastifyRequest<{ Params: { id: string }; Body: CreateTaskRequestSchema }>,
  reply: FastifyReply,
) {
  try {
    const task = await createTask(request.params.id, request.body, request.userId);
    return reply.code(201).send(task);
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({ message: "Error creating task" });
  }
}

export async function updateTaskHandler(
  request: FastifyRequest<{ Params: { id: string }; Body: UpdateTaskRequestSchema }>,
  reply: FastifyReply,
) {
  try {
    const task = await updateTask(request.params.id, request.body, request.userId);
    return reply.code(200).send(task);
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({ message: "Error updating task" });
  }
}

export async function deleteTaskHandler(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  try {
    await deleteTask(request.params.id);
    return reply.code(204).send();
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({ message: "Error deleting task" });
  }
}
