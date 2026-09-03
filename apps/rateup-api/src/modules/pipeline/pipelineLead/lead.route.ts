import { FastifyInstance } from "fastify";
import {
  bulkUpdateLeadsHandler,
  closeLeadHandler,
  createLeadHandler,
  createNoteHandler,
  createTaskHandler,
  deleteLeadHandler,
  deleteNoteHandler,
  deleteTaskHandler,
  getLeadHandler,
  getLeadsHandler,
  moveLeadHandler,
  reopenLeadHandler,
  updateLeadHandler,
  updateTaskHandler,
  getContactStageHandler,
  setContactStageHandler,
  clearContactStageHandler,
  bulkSetContactStageHandler,
} from "./lead.controller.js";
import {
  bulkUpdateLeadsRequestSchema,
  closeLeadRequestSchema,
  createLeadRequestSchema,
  createNoteRequestSchema,
  createTaskRequestSchema,
  idParamsSchema,
  listLeadsQuerySchema,
  moveLeadRequestSchema,
  updateLeadRequestSchema,
  updateTaskRequestSchema,
  contactIdParamsSchema,
  setContactStageRequestSchema,
  bulkSetContactStageRequestSchema,
} from "./lead.schema.js";
import {
  verifyLeadAccess,
  verifyLeadsBulkAccess,
  verifyNoteAccess,
  verifyTaskAccess,
} from "./lead.auth.js";
import { verifyPipelineAccessFromBody, verifyPipelineAccessFromQuery } from "../pipeline.auth.js";

export async function leadRoutes(server: FastifyInstance) {
  // The inbox panel's view of the board: one contact, the column it sits on.
  // Access is the org's, not a pipeline membership — anyone who can open the
  // contact can see and set its stage, the way the lifecycle chips worked.
  server.get(
    "/contact/:contactId/stage",
    { schema: { params: contactIdParamsSchema } },
    getContactStageHandler,
  );
  server.put(
    "/contact/:contactId/stage",
    { schema: { params: contactIdParamsSchema, body: setContactStageRequestSchema } },
    setContactStageHandler,
  );
  server.delete(
    "/contact/:contactId/stage",
    { schema: { params: contactIdParamsSchema } },
    clearContactStageHandler,
  );

  // The contacts table's bulk assign. A collection route rather than
  // `/contact/:id/stage` repeated, so one selection is one request and one
  // report of what changed.
  server.put(
    "/contacts/stage",
    { schema: { body: bulkSetContactStageRequestSchema } },
    bulkSetContactStageHandler,
  );

  server.get(
    "/",
    {
      preHandler: [verifyPipelineAccessFromQuery],
      schema: { querystring: listLeadsQuerySchema },
    },
    getLeadsHandler,
  );

  server.post(
    "/",
    {
      preHandler: [verifyPipelineAccessFromBody],
      schema: { body: createLeadRequestSchema },
    },
    createLeadHandler,
  );

  // Registered before `/:id` so "bulk" is not read as a lead id.
  server.put(
    "/bulk",
    {
      preHandler: [verifyLeadsBulkAccess],
      schema: { body: bulkUpdateLeadsRequestSchema },
    },
    bulkUpdateLeadsHandler,
  );

  server.get(
    "/:id",
    { preHandler: [verifyLeadAccess], schema: { params: idParamsSchema } },
    getLeadHandler,
  );

  server.put(
    "/:id",
    {
      preHandler: [verifyLeadAccess],
      schema: { params: idParamsSchema, body: updateLeadRequestSchema },
    },
    updateLeadHandler,
  );

  server.delete(
    "/:id",
    { preHandler: [verifyLeadAccess], schema: { params: idParamsSchema } },
    deleteLeadHandler,
  );

  server.put(
    "/:id/move",
    {
      preHandler: [verifyLeadAccess],
      schema: { params: idParamsSchema, body: moveLeadRequestSchema },
    },
    moveLeadHandler,
  );

  server.put(
    "/:id/close",
    {
      preHandler: [verifyLeadAccess],
      schema: { params: idParamsSchema, body: closeLeadRequestSchema },
    },
    closeLeadHandler,
  );

  server.put(
    "/:id/reopen",
    { preHandler: [verifyLeadAccess], schema: { params: idParamsSchema } },
    reopenLeadHandler,
  );

  server.post(
    "/:id/notes",
    {
      preHandler: [verifyLeadAccess],
      schema: { params: idParamsSchema, body: createNoteRequestSchema },
    },
    createNoteHandler,
  );

  server.delete(
    "/notes/:id",
    { preHandler: [verifyNoteAccess], schema: { params: idParamsSchema } },
    deleteNoteHandler,
  );

  server.post(
    "/:id/tasks",
    {
      preHandler: [verifyLeadAccess],
      schema: { params: idParamsSchema, body: createTaskRequestSchema },
    },
    createTaskHandler,
  );

  server.put(
    "/tasks/:id",
    {
      preHandler: [verifyTaskAccess],
      schema: { params: idParamsSchema, body: updateTaskRequestSchema },
    },
    updateTaskHandler,
  );

  server.delete(
    "/tasks/:id",
    { preHandler: [verifyTaskAccess], schema: { params: idParamsSchema } },
    deleteTaskHandler,
  );
}
