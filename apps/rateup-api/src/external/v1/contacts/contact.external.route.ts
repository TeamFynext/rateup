import { FastifyInstance } from "fastify";
import {
  createContactsExternalController,
  deleteContactByIdExternalController,
  getAllContactsExternalController,
  getContactByIdExternalController,
  updateContactByIdExternalController,
} from "./contacts.external.controller.js";
import { $contactRef } from "../../../modules/contact/contact.schema.js";
import {
  $extContactSchema,
  extContactSchemas,
} from "../contact-groups/contact.external.schema.js";

export async function externalContactRoutes(server: FastifyInstance) {
  for (const schema of extContactSchemas) {
    server.addSchema(schema);
  }

  server.post(
    "/",
    {
      schema: {
        description: "Create Multiple Contacts (or a single contact)",
        tags: ["Contacts"],
        summary: "Create Contacts",
        body: {
          oneOf: [
            $extContactSchema("createContactSchema"),
            $extContactSchema("createMultipleContactSchema"),
          ],
        },
      },
    },
    createContactsExternalController,
  );

  server.get(
    "/",
    {
      schema: {
        description: "Get all contacts",
        tags: ["Contacts"],
        summary: "Get all contacts",
      },
    },
    getAllContactsExternalController,
  );

  server.get(
    "/:contactId",
    {
      schema: {
        description: "Get a contact by id",
        tags: ["Contacts"],
        summary: "Get a contact by id",
        params: $contactRef("byContactIdSchema"),
      },
    },
    getContactByIdExternalController,
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
      },
    },
    updateContactByIdExternalController,
  );

  server.delete(
    "/:contactId",
    {
      schema: {
        description: "Delete a contact by id",
        tags: ["Contacts"],
        summary: "Delete a contact by id",
        params: $contactRef("byContactIdSchema"),
      },
    },
    deleteContactByIdExternalController,
  );
}
