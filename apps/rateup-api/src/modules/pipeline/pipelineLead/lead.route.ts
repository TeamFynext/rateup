import { FastifyInstance } from "fastify";
import {
  bulkDeleteLeadsHandler,
  bulkUpdateLeadsHandler,
  closeLeadHandler,
  createLeadHandler,
  createNoteHandler,
  createTaskHandler,
  deleteLeadHandler,
  deleteNoteHandler,
  deleteTaskHandler,
  updateNoteHandler,
  getLeadHandler,
  getSharedLeadHandler,
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
  bulkDeleteLeadsRequestSchema,
  bulkUpdateLeadsRequestSchema,
  closeLeadRequestSchema,
  createLeadRequestSchema,
  createNoteRequestSchema,
  createTaskRequestSchema,
  idParamsSchema,
  listLeadsQuerySchema,
  shortUrlIdParamsSchema,
  moveLeadRequestSchema,
  updateLeadRequestSchema,
  updateTaskRequestSchema,
  contactIdParamsSchema,
  setContactStageRequestSchema,
  bulkSetContactStageRequestSchema,
} from "./lead.schema.js";
import {
  verifyLeadAccess,
  verifyLeadShareAccess,
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

  // A share link resolves to the card and its board; the modal fetches the rest.
  server.get(
    "/share/:id",
    { preHandler: [verifyLeadShareAccess], schema: { params: shortUrlIdParamsSchema } },
    getSharedLeadHandler,
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

  // Deleting erases a lead's notes, tasks and history with it, so it is admin-only like
  // deleting a board; everyone else closes a lead as lost instead.
  server.post(
    "/bulk/delete",
    {
      config: { permission: "pipelines.admin" },
      preHandler: [verifyLeadsBulkAccess],
      schema: { body: bulkDeleteLeadsRequestSchema },
    },
    bulkDeleteLeadsHandler,
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
    {
      config: { permission: "pipelines.admin" },
      preHandler: [verifyLeadAccess],
      schema: { params: idParamsSchema },
    },
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

  server.put(
    "/notes/:id",
    {
      preHandler: [verifyNoteAccess],
      schema: { params: idParamsSchema, body: createNoteRequestSchema },
    },
    updateNoteHandler,
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
