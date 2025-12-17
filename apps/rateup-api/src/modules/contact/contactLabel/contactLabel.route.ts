import { FastifyInstance } from "fastify";
import { $contactLabelRef } from "./contactLabel.schema.js";
import { $contactRef } from "../contact.schema.js";
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

export async function contactLabelRoutes(server: FastifyInstance) {
  // Create a new label
  server.post(
    "/",
    {
      schema: {
        body: $contactLabelRef("createContactLabelSchema"),
        response: {
          201: $contactLabelRef("contactLabelResponseSchema"),
        },
      },
    },
    createContactLabelHandler,
  );

  // Get all labels for the organization
  server.get(
    "/",
    {
      schema: {
        response: {
          200: {
            type: "array",
            items: $contactLabelRef("contactLabelResponseSchema"),
          },
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
        querystring: {
          type: "object",
          properties: {
            labelIds: {
              type: "string",
              description: "Comma-separated list of label IDs",
            },
          },
        },
      },
    },
    getContactsWithLabelsHandler,
  );

  // Get a specific label
  server.get(
    "/:labelId",
    {
      schema: {
        params: $contactLabelRef("byLabelIdSchema"),
        response: {
          200: $contactLabelRef("contactLabelResponseSchema"),
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
        params: $contactLabelRef("byLabelIdSchema"),
        body: $contactLabelRef("updateContactLabelSchema"),
        response: {
          200: $contactLabelRef("contactLabelResponseSchema"),
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
        params: $contactLabelRef("byLabelIdSchema"),
      },
    },
    deleteContactLabelHandler,
  );

  // Assign labels to a contact
  server.put(
    "/assign/:contactId",
    {
      schema: {
        params: $contactRef("byContactIdSchema"),
        body: $contactLabelRef("assignLabelsToContactSchema"),
      },
    },
    assignLabelsToContactHandler,
  );

  // Assign labels to a contact
  server.put(
    "/assign",
    {
      schema: {
        body: $contactLabelRef("assignLabelsToContactsSchema"),
      },
    },
    assignLabelsToContactsHandler,
  );
}
