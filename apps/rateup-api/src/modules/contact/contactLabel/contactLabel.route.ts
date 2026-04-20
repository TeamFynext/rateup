import { FastifyInstance } from "fastify";
import {
  createContactLabelSchema,
  contactLabelResponseSchema,
  byLabelIdSchema,
  updateContactLabelSchema,
  assignLabelsToContactSchema,
  assignLabelsToContactsSchema,
  assignLabelsToContactQuerySchema,
} from "./contactLabel.schema.js";
import {
  createContactLabelHandler,
  getAllContactLabelsHandler,
  getContactLabelByIdHandler,
  updateContactLabelHandler,
  deleteContactLabelHandler,
  assignLabelsToContactHandler,
  getContactsWithLabelsHandler,
  assignLabelsToContactsHandler,
} from "./contactLabel.controller.js";
import { byContactIdSchema } from "../contact.schema.js";

export async function contactLabelRoutes(server: FastifyInstance) {
  // Create a new label
  server.post(
    "/",
    {
      schema: {
        body: createContactLabelSchema,
        response: {
          201: contactLabelResponseSchema,
        },
      },
    },
    createContactLabelHandler,
  );

  // Get all labels for the organization
  server.get(
    "/",
    {
      onSend: async (_req, reply, payload) => {
        if (reply.statusCode === 403) {
          reply.code(200);
          return "[]";
        }
        return payload;
      },
      schema: {
        response: {
          200: contactLabelResponseSchema.array(),
        },
      },
    },
    getAllContactLabelsHandler,
  );

  // Get contacts filtered by labels
  server.get(
    "/contacts",
    {
      schema: {
        querystring: assignLabelsToContactQuerySchema,
      },
    },
    getContactsWithLabelsHandler,
  );

  // Get a specific label
  server.get(
    "/:labelId",
    {
      schema: {
        params: byLabelIdSchema,
        response: {
          200: contactLabelResponseSchema,
        },
      },
    },
    getContactLabelByIdHandler,
  );

  // Update a label
  server.put(
    "/:labelId",
    {
      schema: {
        params: byLabelIdSchema,
        body: updateContactLabelSchema,
        response: {
          200: contactLabelResponseSchema,
        },
      },
    },
    updateContactLabelHandler,
  );

  // Delete a label
  server.delete(
    "/:labelId",
    {
      schema: {
        params: byLabelIdSchema,
      },
    },
    deleteContactLabelHandler,
  );

  // Assign labels to a contact
  server.put(
    "/assign/:contactId",
    {
      schema: {
        params: byContactIdSchema,
        body: assignLabelsToContactSchema,
      },
    },
    assignLabelsToContactHandler,
  );

  // Assign labels to a contact
  server.put(
    "/assign",
    {
      schema: {
        body: assignLabelsToContactsSchema,
      },
    },
    assignLabelsToContactsHandler,
  );
}
