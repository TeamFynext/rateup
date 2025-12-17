import { FastifyInstance } from "fastify";
import { $extContactSchema } from "./contact.external.schema.js";
import { extCreateMultipleContactsHandler } from "./contact.external.controller.js";
import {
  deleteContactByIdHandler,
  getAllContactsHandler,
  getContactByIdHandler,
  updateContactByIdHandler,
} from "./internal-copy/contact/contact.controller.js";
import { $contactRef } from "./internal-copy/contact/contact.schema.js";

export async function externalContactRoutes(server: FastifyInstance) {
  server.post(
    "/",
    {
      schema: {
        description: "Create Multiple Contacts (or a single contact)",
        tags: ["Contacts"],
        summary: "Create Contacts",
        body: $extContactSchema("createMultipleContactSchema"),
      },
    },
    extCreateMultipleContactsHandler,
  );

  server.get(
    "/",
    {
      schema: {
        description: "Get all contacts",
        tags: ["Contacts"],
        summary: "Get all contacts",
        response: {
          200: {
            type: "array",
            items: $extContactSchema("contactResponseSchema"),
          },
        },
      },
    },
    getAllContactsHandler,
  );
  server.get(
    "/:contactId",
    {
      schema: {
        description: "Get a contact by id",
        tags: ["Contacts"],
        summary: "Get a contact by id",
        params: $contactRef("byContactIdSchema"),
        response: {
          200: $extContactSchema("contactResponseSchema"),
        },
      },
    },
    getContactByIdHandler,
  );

  server.put(
    "/:contactId",
    {
      schema: {
        description: "Update a contact by id",
        tags: ["Contacts"],
        summary: "Update a contact by id",
        params: $contactRef("byContactIdSchema"),
        body: $contactRef("updateContactSchema"),
        response: {
          200: $extContactSchema("contactResponseSchema"),
        },
      },
    },
    updateContactByIdHandler,
  );

  server.delete(
    "/:contactId",
    {
      schema: {
        description: "Delete a contact by id",
        tags: ["Contacts"],
        summary: "Delete a contact by id",
        params: $contactRef("byContactIdSchema"),
        response: {
          200: $extContactSchema("contactResponseSchema"),
        },
      },
    },
    deleteContactByIdHandler,
  );
}
