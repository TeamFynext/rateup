import { FastifyInstance } from "fastify";
import { $contactRef } from "./contact.schema.js";
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
  updateLifecycleStageofContactsHandler,
} from "./contact.controller.js";
import { contactGroupRoutes } from "./contactGroup/contactGroup.route.js";
import { contactGroupSchemas } from "./contactGroup/contactGroup.schema.js";
import { contactLabelRoutes } from "./contactLabel/contactLabel.route.js";
import { contactLabelSchemas } from "./contactLabel/contactLabel.schema.js";
import { checkSession } from "../../utils/checkSession.js";
import fastifyMultipart from "@fastify/multipart";
import { getVerifySubscriptionHandler } from "../../utils/auth.js";
import { SubscriptionFeaturePathName } from "../../types/enums.js";
import { $LifecycleRef } from "../lifecycle/lifecycle.schema.js";
import { conversationRoutes } from "./conversation/conversation.route.js";
import { conversationSchemas } from "./conversation/conversation.schema.js";
import { verifyLCustomerMaxCountRestrictionHandler } from "./contact.utils.js";

export async function contactRoutes(server: FastifyInstance) {
  server.addHook("preHandler", checkSession);

  contactGroupSchemas.forEach((schema) => server.addSchema(schema));
  server.register(contactGroupRoutes, { prefix: "/group" });

  contactLabelSchemas.forEach((schema) => server.addSchema(schema));
  server.register(contactLabelRoutes, { prefix: "/labels" });

  conversationSchemas.forEach((schema) => server.addSchema(schema));
  server.register(conversationRoutes, { prefix: "/conversations" });

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

  server.put(
    "/lifecycle-stage-update/:lifecycleId",
    {
      schema: {
        params: $LifecycleRef("lifecycleIdParamSchema"),
        body: $contactRef("deleteManyContactSchema"),
      },
    },
    updateLifecycleStageofContactsHandler,
  );
}
