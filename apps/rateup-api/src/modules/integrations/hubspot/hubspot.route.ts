import type { FastifyInstance } from "fastify";
import fastifyRawBody from "fastify-raw-body";
import z from "zod";

import { log } from "../../../utils/logger.js";
import { OAuthConnectError } from "../shared/oauthConnectError.js";
import { getHubSpotPipelines, getHubSpotStatus, updateHubSpotSettings } from "./hubspot.connect.js";
import { HubSpotSignatureError, receiveHubSpotWebhook } from "./hubspot.webhook.js";
import { startHubSpotBulk } from "./hubspot.bulk.js";

const settingsSchema = z
  .object({
    syncContacts: z.boolean().optional(),
    syncDeals: z.boolean().optional(),
    dealPipelineId: z.string().min(1).max(100).optional(),
    stageMappings: z
      .array(
        z
          .object({ stageId: z.string().uuid(), hubspotStageId: z.string().min(1).max(100) })
          .strict(),
      )
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
 * Under `/api/integrations/hubspot`, inheriting the integrations module's
 * permissions. Connecting is the shared `/:name/oauth/*` pair; disconnecting is
 * the generic `DELETE /api/integrations/hubspot`, which revokes the grant
 * through the provider's `disconnect`.
 */
export async function hubSpotRoutes(server: FastifyInstance) {
  server.get("/status", async (request, reply) => {
    try {
      return reply.send(await getHubSpotStatus(request.user.orgId));
    } catch (error) {
      log.error({ err: error }, "HubSpot status failed");
      return reply.code(500).send({ error: "Something went wrong" });
    }
  });

  server.get("/pipelines", async (request, reply) => {
    try {
      return reply.send(await getHubSpotPipelines(request.user.orgId));
    } catch (error) {
      if (error instanceof OAuthConnectError) {
        return reply.code(error.statusCode).send({ error: error.message });
      }
      log.error({ err: error }, "HubSpot pipelines failed");
      return reply.code(502).send({ error: "Could not load the pipelines from HubSpot" });
    }
  });

  // The first-time sync: `import` pulls HubSpot's contacts in, `export` sends RateUp's
  // out. Both run in the background; the status shows their progress.
  for (const kind of ["import", "export"] as const) {
    server.post(`/${kind}`, async (request, reply) => {
      try {
        await startHubSpotBulk(request.user.orgId, kind);
        return reply.send(await getHubSpotStatus(request.user.orgId));
      } catch (error) {
        if (error instanceof OAuthConnectError) {
          return reply.code(error.statusCode).send({ error: error.message });
        }
        log.error({ err: error }, "HubSpot %s failed to start", kind);
        return reply.code(500).send({ error: "Something went wrong" });
      }
    });
  }

  server.put<{ Body: SettingsBody }>(
    "/settings",
    { schema: { body: settingsSchema } },
    async (request, reply) => {
      try {
        return reply.send(await updateHubSpotSettings(request.user.orgId, request.body));
      } catch (error) {
        if (error instanceof OAuthConnectError) {
          return reply.code(error.statusCode).send({ error: error.message });
        }
        log.error({ err: error }, "HubSpot settings failed");
        return reply.code(500).send({ error: "Something went wrong" });
      }
    },
  );
}

/**
 * HubSpot's app webhooks, under `/api/public/integrations/hubspot`: one address for
 * every connected account (see `hubspot.webhook.ts`). No session — HubSpot is
 * calling — so it is trusted only as far as the v3 signature. The raw body is kept
 * for that signature, scoped to this plugin.
 */
export async function hubSpotPublicRoutes(server: FastifyInstance) {
  await server.register(fastifyRawBody, {
    field: "rawBody",
    global: false,
    encoding: "utf8",
    runFirst: true,
  });

  server.post("/webhooks", { config: { rawBody: true } }, async (request, reply) => {
    try {
      await receiveHubSpotWebhook({
        method: request.method,
        path: request.url,
        rawBody: (request as typeof request & { rawBody?: string }).rawBody,
        headers: request.headers,
        body: request.body,
      });
      return reply.code(200).send({ ok: true });
    } catch (error) {
      if (error instanceof HubSpotSignatureError) {
        log.warn("Rejected a HubSpot webhook delivery: %s", error.message);
        return reply.code(401).send({ error: "Unauthorized" });
      }
      // A 5xx asks HubSpot to retry, which is right for a queue briefly unreachable.
      log.error({ err: error }, "HubSpot webhook delivery failed");
      return reply.code(500).send({ error: "Delivery failed" });
    }
  });
}
