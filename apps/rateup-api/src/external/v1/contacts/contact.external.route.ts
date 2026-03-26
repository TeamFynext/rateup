import { FastifyInstance } from "fastify";
import {
  createContactsExternalController,
  deleteContactByIdExternalController,
  getAllContactsExternalController,
  getContactByIdExternalController,
  updateContactByIdExternalController,
} from "./contacts.external.controller.js";
import {
  byContactIdSchema,
  updateContactSchema,
  createMultipleContactSchema,
} from "../../../modules/contact/contact.schema.js";
import { createContactSchema } from "../contact-groups/contact.external.schema.js";
import z from "zod";

export async function externalContactRoutes(server: FastifyInstance) {
  server.post(
    "/",
    {
      schema: {
        description: "Create Multiple Contacts (or a single contact)",
        tags: ["Contacts"],
        summary: "Create Contacts",
        body: z.union([createContactSchema, createMultipleContactSchema]),
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
        params: byContactIdSchema,
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
        params: byContactIdSchema,
        body: updateContactSchema,
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
        params: byContactIdSchema,
      },
    },
    deleteContactByIdExternalController,
  );
}
