import type { ContactCore } from "./contact.schema.js";
import { FastifyInstance } from "fastify";
import {
  contactCoreSchema,
  createMultipleContactSchema,
  paginationQuery,
  byContactIdSchema,
  updateContactSchema,
  updateContactLabelsSchema,
  deleteManyContactSchema,
  customFieldSchema,
  byFieldIdSchema,
  bulkUpdateContactStatusSchema,
} from "./contact.schema.js";
import {
  addCustomFieldHandler,
  bulkUpdateWaMessageAssignStatusHandler,
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
import { contactLabelRoutes } from "./contactLabel/contactLabel.route.js";
import { checkSession } from "../../utils/checkSession.js";
import fastifyMultipart from "@fastify/multipart";
import { getVerifySubscriptionHandler } from "../../utils/auth.js";
import { SubscriptionFeaturePathName } from "../../types/enums.js";
import { conversationRoutes } from "./conversation/conversation.route.js";
import { conversationTagRoutes } from "./conversationTag/conversationTag.route.js";
import { lifecycleIdParamSchema } from "../lifecycle/lifecycle.schema.js";

import { requireFeature, TeamFeature } from "../../utils/permissions.js";

export async function contactRoutes(server: FastifyInstance) {
  server.addHook("preHandler", checkSession);
  server.addHook("preHandler", requireFeature(TeamFeature.contacts));

  server.register(contactGroupRoutes, { prefix: "/group" });

  server.register(contactLabelRoutes, { prefix: "/labels" });

  server.register(conversationRoutes, { prefix: "/conversations" });

  // Conversation-scoped tags — the ticket-grained counterpart to `/labels`,
  // which stay on the contact.
  server.register(conversationTagRoutes, { prefix: "/conversation-tags" });

  server.register(fastifyMultipart, {
    limits: {
      fileSize: 1048576 * 10,
    },
    throwFileSizeLimit: true,
  });

  server.post<{ Body: ContactCore }>(
    "/",
    {
      preHandler: [getVerifySubscriptionHandler([SubscriptionFeaturePathName.Whatsapp])],
      schema: {
        body: contactCoreSchema,
      },
    },
    createContactHandler,
  );

  server.post(
    "/importcontacts",
    {
      schema: {
        body: createMultipleContactSchema,
      },
    },
    createMultipleContactsHandler,
  );

  server.get(
    "/",
    {
      schema: {
        params: paginationQuery,
      },
    },
    getAllContactsHandler,
  );
  server.get(
    "/:contactId",
    {
      schema: {
        params: byContactIdSchema,
      },
    },
    getContactByIdHandler,
  );

  server.put(
    "/:contactId",
    {
      schema: {
        params: byContactIdSchema,
        body: updateContactSchema,
      },
    },
    updateContactByIdHandler,
  );
  server.put(
    "/:contactId/labels",
    {
      schema: {
        params: byContactIdSchema,
        body: updateContactLabelsSchema,
      },
    },
    updateContactLabelsByIdHandler,
  );

  server.delete(
    "/:contactId",
    {
      schema: {
        params: byContactIdSchema,
      },
    },
    deleteContactByIdHandler,
  );

  server.delete(
    "/",
    {
      schema: {
        body: deleteManyContactSchema,
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
  server.get(
    "/custom-fields",
    {
      config: {
        fallbackEmptyArray: true,
      },
    },
    getCustomFieldHandler,
  );
  server.post(
    "/custom-fields",
    {
      schema: {
        body: customFieldSchema,
      },
    },
    addCustomFieldHandler,
  );
  server.put(
    "/custom-fields/:fieldId",
    {
      schema: {
        params: byFieldIdSchema,
        body: customFieldSchema,
      },
    },
    updateCustomFieldHandler,
  );

  server.delete(
    "/custom-fields/:fieldId",
    {
      schema: {
        params: byFieldIdSchema,
      },
    },
    deleteCustomFieldHandler,
  );
  server.post("/export", exportContactHandler);

  server.put(
    "/lifecycle-stage-update/:lifecycleId",
    {
      schema: {
        params: lifecycleIdParamSchema,
        body: deleteManyContactSchema,
      },
    },
    updateLifecycleStageofContactsHandler,
  );

  server.put(
    "/bulk-assign-status",
    {
      schema: {
        body: bulkUpdateContactStatusSchema,
      },
    },
    bulkUpdateWaMessageAssignStatusHandler,
  );
}
