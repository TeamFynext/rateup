import { FastifyInstance } from "fastify";
import { $contactRef } from "./contact.schema";
import {
  createContactHandler,
  createMultipleContactsHandler,
  deleteContactByIdHandler,
  deleteManyContactsHandler,
  getAllContactsHandler,
  getContactByIdHandler,
  importCSVContactsHandler,
  updateContactByIdHandler,
} from "./contact.controller";
import { contactGroupRoutes } from "./contactGroup/contactGroup.route";
import { contactGroupSchemas } from "./contactGroup/contactGroup.schema";
import { checkSession } from "../../utils/checkSession";
import fastifyMultipart from "@fastify/multipart";

export async function contactRoutes(server: FastifyInstance) {
  server.addHook("preHandler", checkSession);

  contactGroupSchemas.forEach((schema) => server.addSchema(schema));
  server.register(contactGroupRoutes, { prefix: "/group" });
  server.register(fastifyMultipart, {
    limits: {
      fileSize: 1048576 * 10,
    },
    throwFileSizeLimit: true,
  });

  server.post(
    "/",
    {
      schema: {
        body: $contactRef("contactCoreSchema"),
      },
    },
    createContactHandler,
  );

  server.post(
    "/importcontacts",
    {
      schema: {
        body: $contactRef("createMultipleContactSchema"),
      },
    },
    createMultipleContactsHandler,
  );

  server.get("/", getAllContactsHandler);
  server.get(
    "/:contactId",
    {
      schema: {
        params: $contactRef("byContactIdSchema"),
      },
    },
    getContactByIdHandler,
  );

  server.put(
    "/:contactId",
    {
      schema: {
        params: $contactRef("byContactIdSchema"),
        body: $contactRef("updateContactSchema"),
      },
    },
    updateContactByIdHandler,
  );

  server.delete(
    "/:contactId",
    {
      schema: {
        params: $contactRef("byContactIdSchema"),
      },
    },
    deleteContactByIdHandler,
  );

  server.delete(
    "/",
    {
      schema: {
        body: $contactRef("deleteManyContactSchema"),
      },
    },
    deleteManyContactsHandler,
  );

  server.post(
    "/importcsv",
    {
      schema: {
        consumes: ["multipart/form-data"],
      },
    },
    importCSVContactsHandler,
  );
}
