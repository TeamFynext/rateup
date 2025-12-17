import { FastifyInstance } from "fastify";
import { $contactRef } from "./contact.schema.js";
import {
  createContactHandler,
  createMultipleContactsHandler,
  deleteContactByIdHandler,
  deleteManyContactsHandler,
  getAllContactsHandler,
  getContactByIdHandler,
  updateContactByIdHandler,
} from "./contact.controller.js";
import { contactGroupRoutes } from "./contactGroup/contactGroup.route.js";
import { contactGroupSchemas } from "./contactGroup/contactGroup.schema.js";
import { checkSession } from "../../../../../../utils/checkSession.js";

export async function contactRoutes(server: FastifyInstance) {
  server.addHook("preHandler", checkSession);

  contactGroupSchemas.forEach((schema) => server.addSchema(schema));
  server.register(contactGroupRoutes, { prefix: "/group" });

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
}
