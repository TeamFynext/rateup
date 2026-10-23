import type { FastifyInstance } from "fastify";
import z from "zod";

import { log } from "../../../utils/logger.js";
import { OAuthConnectError } from "../shared/oauthConnectError.js";
import { startPipedriveBulk } from "./pipedrive.bulk.js";
import {
  getPipedrivePipelines,
  getPipedriveStatus,
  repairPipedriveWebhooks,
  updatePipedriveSettings,
} from "./pipedrive.connect.js";

const pipedriveId = z.number().int().positive();

const settingsSchema = z
  .object({
    syncContacts: z.boolean().optional(),
    syncDeals: z.boolean().optional(),
    dealPipelineId: pipedriveId.optional(),
    stageMappings: z
      .array(z.object({ stageId: z.string().uuid(), pipedriveStageId: pipedriveId }).strict())
      .max(200)
      .optional(),
    importContacts: z.boolean().optional(),
    importDeals: z.boolean().optional(),
    logConversations: z.boolean().optional(),
    logSurveyResponses: z.boolean().optional(),
  })
  .strict();
type SettingsBody = z.infer<typeof settingsSchema>;

/**
 * Under `/api/integrations/pipedrive`, inheriting the integrations module's
 * permissions. Connecting is the shared `/:name/oauth/*` pair; disconnecting is
 * the generic `DELETE /api/integrations/pipedrive`, which revokes the grant
 * through the provider's `disconnect`.
 */
export async function pipedriveRoutes(server: FastifyInstance) {
  server.get("/status", async (request, reply) => {
    try {
      return reply.send(await getPipedriveStatus(request.user.orgId));
    } catch (error) {
      log.error({ err: error }, "Pipedrive status failed");
      return reply.code(500).send({ error: "Something went wrong" });
    }
  });

  server.get("/pipelines", async (request, reply) => {
    try {
      return reply.send(await getPipedrivePipelines(request.user.orgId));
    } catch (error) {
      if (error instanceof OAuthConnectError) {
        return reply.code(error.statusCode).send({ error: error.message });
      }
      log.error({ err: error }, "Pipedrive pipelines failed");
      return reply.code(502).send({ error: "Could not load the pipelines from Pipedrive" });
    }
  });

  // The first-time sync: `import` pulls Pipedrive's persons in, `export` sends
  // RateUp's out. Both run in the background; the status shows their progress.
  for (const kind of ["import", "export"] as const) {
    server.post(`/${kind}`, async (request, reply) => {
      try {
        await startPipedriveBulk(request.user.orgId, kind);
        return reply.send(await getPipedriveStatus(request.user.orgId));
      } catch (error) {
        if (error instanceof OAuthConnectError) {
          return reply.code(error.statusCode).send({ error: error.message });
        }
        log.error({ err: error }, "Pipedrive %s failed to start", kind);
        return reply.code(500).send({ error: "Something went wrong" });
      }
    });
  }

  server.post("/webhooks/repair", async (request, reply) => {
    try {
      return reply.send(await repairPipedriveWebhooks(request.user.orgId));
    } catch (error) {
      if (error instanceof OAuthConnectError) {
        return reply.code(error.statusCode).send({ error: error.message });
      }
      log.error({ err: error }, "Pipedrive webhook repair failed");
      return reply.code(502).send({ error: "Could not register the webhooks with Pipedrive" });
    }
  });

  server.put<{ Body: SettingsBody }>(
    "/settings",
    { schema: { body: settingsSchema } },
    async (request, reply) => {
      try {
        return reply.send(await updatePipedriveSettings(request.user.orgId, request.body));
      } catch (error) {
        if (error instanceof OAuthConnectError) {
          return reply.code(error.statusCode).send({ error: error.message });
        }
        log.error({ err: error }, "Pipedrive settings failed");
        return reply.code(500).send({ error: "Something went wrong" });
      }
    },
  );
}
