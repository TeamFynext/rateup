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
  listLeads,
  BadCursorError,
  moveLead,
  reopenLead,
  updateLead,
  updateTask,
  getContactStage,
  setContactStage,
  clearContactStage,
  bulkSetContactStage,
} from "./lead.service.js";
import type {
  BulkUpdateLeadsRequestSchema,
  ListLeadsQuerySchema,
  CloseLeadRequestSchema,
  CreateLeadRequestSchema,
  CreateNoteRequestSchema,
  CreateTaskRequestSchema,
  UpdateLeadRequestSchema,
  UpdateTaskRequestSchema,
} from "./lead.schema.js";

export async function getLeadsHandler(
  request: FastifyRequest<{ Querystring: ListLeadsQuerySchema }>,
  reply: FastifyReply,
) {
  try {
    const page = await listLeads(request.query, request.userId);
    return reply.code(200).send(page);
  } catch (error) {
    // A cursor the client mangled is its mistake, not the server's.
    if (error instanceof BadCursorError) {
      return reply.code(400).send({ message: error.message });
    }
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
    // Prisma raises P2025 when the scoped lookup matched nothing, which here
    // means the column is not on this lead's board. That is a bad request, not
    // a server fault, and saying so beats a generic 500 that reads as an outage.
    if (error && typeof error === "object" && (error as { code?: string }).code === "P2025") {
      return reply.code(400).send({ message: "That column is not on this lead's board" });
    }
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

/**
 * Where the contact sits on the org's board, for the inbox panel. Answers 200
 * with `null` rather than 404 when the org has no board: not having a pipeline
 * is an ordinary state, not a missing resource.
 */
export async function getContactStageHandler(
  request: FastifyRequest<{ Params: { contactId: string } }>,
  reply: FastifyReply,
) {
  try {
    const result = await getContactStage(request.params.contactId, request.user.orgId);
    return reply.code(200).send(result);
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({ message: "Error reading the contact's stage" });
  }
}

export async function setContactStageHandler(
  request: FastifyRequest<{ Params: { contactId: string }; Body: { stageId: string } }>,
  reply: FastifyReply,
) {
  try {
    const current = await getContactStage(request.params.contactId, request.user.orgId);
    if (!current) return reply.code(404).send({ message: "No pipeline for this contact" });

    const lead = await setContactStage({
      contactId: request.params.contactId,
      pipelineId: current.pipelineId,
      stageId: request.body.stageId,
      source: "MANUAL",
      channel: "NONE",
      userId: request.userId,
      automated: false,
    });

    // Null means the lead was already on that column — nothing changed, which is
    // success from the caller's point of view.
    return reply.code(200).send(lead ?? { unchanged: true });
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({ message: "Error setting the contact's stage" });
  }
}

/**
 * The contacts table's bulk assign. Reports what actually happened rather than a
 * bare 200: a selection can contain contacts already sitting on the target
 * column, and the toast should not claim to have moved them.
 */
export async function bulkSetContactStageHandler(
  request: FastifyRequest<{ Body: { stageId: string; contactIds: string[] } }>,
  reply: FastifyReply,
) {
  try {
    const result = await bulkSetContactStage({
      contactIds: request.body.contactIds,
      orgId: request.user.orgId,
      stageId: request.body.stageId,
      userId: request.userId,
    });
    if (!result) return reply.code(404).send({ message: "No such stage on this org's pipeline" });
    return reply.code(200).send(result);
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({ message: "Error assigning the stage" });
  }
}

/**
 * Takes the contact off the board. Destructive — the lead and everything on it
 * goes — so the client must confirm before calling.
 */
export async function clearContactStageHandler(
  request: FastifyRequest<{ Params: { contactId: string } }>,
  reply: FastifyReply,
) {
  try {
    const current = await getContactStage(request.params.contactId, request.user.orgId);
    if (!current) return reply.code(404).send({ message: "No pipeline for this contact" });

    const leadId = await clearContactStage(request.params.contactId, current.pipelineId);
    return reply.code(200).send({ leadId });
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({ message: "Error clearing the contact's stage" });
  }
}
