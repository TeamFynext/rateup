import type { FastifyInstance } from "fastify";

import { declareAccess } from "../../../../authz/registry.js";
import { createContactHandler } from "../../../contact/contact.controller.js";
import { automationKeyAuth } from "../automation.auth.js";
import type { AutomationPlatform } from "../automation.platforms.js";
import {
  automationAddGroupMembersHandler,
  automationAttachHookHandler,
  automationDeleteContactHandler,
  automationDetachHookHandler,
  automationGroupsHandler,
  automationHookSampleHandler,
  automationLifecyclesHandler,
  automationMeHandler,
  automationSearchContactsHandler,
  automationSendTemplateHandler,
  automationSendTextHandler,
  automationSetLifecycleHandler,
  automationTeamsHandler,
  automationTemplatesHandler,
  automationUpdateContactHandler,
} from "./automationApi.controller.js";
import {
  automationContactParamsSchema,
  automationContactSearchSchema,
  automationCreateContactSchema,
  automationGroupMembersSchema,
  automationGroupParamsSchema,
  automationGroupsQuerySchema,
  automationHookBodySchema,
  automationHookParamsSchema,
  automationLifecycleBodySchema,
  automationSampleQuerySchema,
  automationTemplateMessageSchema,
  automationTextMessageSchema,
  automationUpdateContactSchema,
} from "./automationApi.schema.js";

/**
 * The API a platform's RateUp app calls, mounted once per platform at
 * `/api/integration/external/<platform>`. Every route takes the org and the
 * platform from the API key, so one platform's key never reaches another's routes.
 */
export function automationApiRoutes(platform: AutomationPlatform) {
  return async function automationRoutes(server: FastifyInstance) {
    declareAccess(server, { access: "token" });
    server.addHook("preHandler", automationKeyAuth(platform));

    server.get("/me", automationMeHandler);

    // Instant triggers
    server.post(
      "/hooks",
      { schema: { body: automationHookBodySchema } },
      automationAttachHookHandler,
    );
    server.delete(
      "/hooks/:id",
      { schema: { params: automationHookParamsSchema } },
      automationDetachHookHandler,
    );
    server.get(
      "/hooks/sample",
      { schema: { querystring: automationSampleQuerySchema } },
      automationHookSampleHandler,
    );

    // Contacts
    server.post(
      "/contacts",
      { schema: { body: automationCreateContactSchema } },
      createContactHandler,
    );
    server.get(
      "/contacts",
      { schema: { querystring: automationContactSearchSchema } },
      automationSearchContactsHandler,
    );
    server.patch(
      "/contacts/:id",
      { schema: { params: automationContactParamsSchema, body: automationUpdateContactSchema } },
      automationUpdateContactHandler,
    );
    server.delete(
      "/contacts/:id",
      { schema: { params: automationContactParamsSchema } },
      automationDeleteContactHandler,
    );
    server.put(
      "/contacts/:id/lifecycle",
      { schema: { params: automationContactParamsSchema, body: automationLifecycleBodySchema } },
      automationSetLifecycleHandler,
    );
    server.post(
      "/groups/:groupId/members",
      { schema: { params: automationGroupParamsSchema, body: automationGroupMembersSchema } },
      automationAddGroupMembersHandler,
    );

    // Messages
    server.post(
      "/messages/text",
      { schema: { body: automationTextMessageSchema } },
      automationSendTextHandler,
    );
    server.post(
      "/messages/template",
      { schema: { body: automationTemplateMessageSchema } },
      automationSendTemplateHandler,
    );

    // Dropdowns
    server.get("/teams", automationTeamsHandler);
    server.get(
      "/groups",
      { schema: { querystring: automationGroupsQuerySchema } },
      automationGroupsHandler,
    );
    server.get("/lifecycles", automationLifecyclesHandler);
    server.get("/templates", automationTemplatesHandler);
  };
}
