import { FastifyInstance } from "fastify";
import { $contactRef } from "./contact.schema";
import {
  createContactHandler,
  createMultipleContactsHandler,
  deleteContactByIdHandler,
  deleteManyContactsHandler,
  getAllContactsHandler,
  updateContactByIdHandler,
} from "./contact.controller";
import { contactGroupRoutes } from "./contactGroup/contactGroup.route";
import { contactGroupSchemas } from "./contactGroup/contactGroup.schema";
import { checkSession } from "../../utils/checkSession";

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
