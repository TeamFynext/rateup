import { FastifyInstance } from "fastify";
import { $contactRef } from "./contact.schema";
import {
  addCustomFieldHandler,
  createContactHandler,
  createMultipleContactsHandler,
  deleteContactByIdHandler,
  deleteCustomFieldHandler,
  deleteManyContactsHandler,
  exportContactHandler,
  getAllContactsHandler,
  getContactByIdHandler,
  getCustomFieldHandler,
  importCSVContactsHandler,
  updateContactByIdHandler,
  updateContactLabelsByIdHandler,
  updateCustomFieldHandler,
} from "./contact.controller";
import { contactGroupRoutes } from "./contactGroup/contactGroup.route";
import { contactGroupSchemas } from "./contactGroup/contactGroup.schema";
import { contactLabelRoutes } from "./contactLabel/contactLabel.route";
import { contactLabelSchemas } from "./contactLabel/contactLabel.schema";
import { checkSession } from "../../utils/checkSession";
import fastifyMultipart from "@fastify/multipart";
import { getVerifySubscriptionHandler } from "../../utils/auth";
import { verifyLCustomerMaxCountRestrictionHandler } from "../loyalty/customer/customer.controller";
import { SubscriptionFeaturePathName } from "../../types/enums";

export async function contactRoutes(server: FastifyInstance) {
  server.addHook("preHandler", checkSession);

  contactGroupSchemas.forEach((schema) => server.addSchema(schema));
  server.register(contactGroupRoutes, { prefix: "/group" });

  contactLabelSchemas.forEach((schema) => server.addSchema(schema));
  server.register(contactLabelRoutes, { prefix: "/labels" });

  server.register(fastifyMultipart, {
    limits: {
      fileSize: 1048576 * 10,
    },
    throwFileSizeLimit: true,
  });

  server.post(
    "/",
    {
      preHandler: [
        getVerifySubscriptionHandler([
          SubscriptionFeaturePathName.LoyaltyCustomer,
        ]),
        verifyLCustomerMaxCountRestrictionHandler,
      ],
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

  server.get(
    "/",
    {
      schema: {
        params: $contactRef("paginationQuery"),
      },
    },
    getAllContactsHandler,
  );
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
  server.put(
    "/:contactId/labels",
    {
      schema: {
        params: $contactRef("byContactIdSchema"),
        body: $contactRef("updateContactLabelsSchema"),
      },
    },
    updateContactLabelsByIdHandler,
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
  server.get("/custom-fields", getCustomFieldHandler);
  server.post(
    "/custom-fields",
    {
      schema: {
        body: $contactRef("customFieldSchema"),
      },
    },
    addCustomFieldHandler,
  );
  server.put(
    "/custom-fields/:fieldId",
    {
      schema: {
        params: $contactRef("byFieldIdSchema"),
        body: $contactRef("customFieldSchema"),
      },
    },
    updateCustomFieldHandler,
  );

  server.delete(
    "/custom-fields/:fieldId",
    {
      schema: {
        params: $contactRef("byFieldIdSchema"),
      },
    },
    deleteCustomFieldHandler,
  );
  server.post("/export", exportContactHandler);
}
