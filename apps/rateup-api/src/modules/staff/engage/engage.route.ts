import type { FastifyInstance } from "fastify";
import { idParamSchema, pageQuerySchema, type IdParam } from "../staff.schema.js";
import type { z } from "zod";
import {
  audiencePreviewSchema,
  broadcastInputSchema,
  dripContentSchema,
  dripEmailInputSchema,
  dripKeyParamSchema,
  dripToggleSchema,
  scheduleSchema,
  testSendSchema,
  type AudiencePreviewInput,
  type BroadcastInput,
  type DripContentInput,
  type DripEmailInput,
  type DripKeyParam,
  type DripToggleInput,
  type ScheduleInput,
  type TestSendInput,
} from "./engage.schema.js";
import {
  createBroadcast,
  deleteBroadcast,
  getBroadcast,
  getDripStep,
  listBroadcasts,
  listDripSteps,
  orgCustomerMessages,
  previewAudience,
  previewBroadcast,
  previewDripDraft,
  previewDripStep,
  resetDripContent,
  saveDripContent,
  scheduleBroadcast,
  senderTemplates,
  setDripStepEnabled,
  testBroadcast,
  testDripStep,
  unscheduleBroadcast,
  updateBroadcast,
} from "./engage.service.js";

/** Engage: RateUp's own onboarding emails and broadcasts to its customers. */
export async function staffEngageRoutes(server: FastifyInstance) {
  server.get("/engage/drip", async () => listDripSteps());

  server.get<{ Params: DripKeyParam }>(
    "/engage/drip/:key",
    { schema: { params: dripKeyParamSchema } },
    async (request) => ({ data: await getDripStep(request.params.key) }),
  );

  server.put<{ Params: DripKeyParam; Body: DripContentInput }>(
    "/engage/drip/:key/content",
    { schema: { params: dripKeyParamSchema, body: dripContentSchema } },
    async (request) => ({
      data: await saveDripContent(request, request.params.key, request.body),
    }),
  );

  server.delete<{ Params: DripKeyParam }>(
    "/engage/drip/:key/content",
    { schema: { params: dripKeyParamSchema } },
    async (request) => ({ data: await resetDripContent(request, request.params.key) }),
  );

  server.post<{ Params: DripKeyParam; Body: DripEmailInput }>(
    "/engage/drip/:key/preview",
    {
      config: { staffReadOnly: true },
      schema: { params: dripKeyParamSchema, body: dripEmailInputSchema },
    },
    async (request) => ({
      data: await previewDripDraft(request, request.params.key, request.body.email),
    }),
  );

  server.put<{ Params: DripKeyParam; Body: DripToggleInput }>(
    "/engage/drip/:key",
    { schema: { params: dripKeyParamSchema, body: dripToggleSchema } },
    async (request) => ({
      data: await setDripStepEnabled(request, request.params.key, request.body.enabled),
    }),
  );

  server.get<{ Params: DripKeyParam }>(
    "/engage/drip/:key/preview",
    { schema: { params: dripKeyParamSchema } },
    async (request) => ({ data: await previewDripStep(request, request.params.key) }),
  );

  server.post<{ Params: DripKeyParam; Body: TestSendInput }>(
    "/engage/drip/:key/test",
    { schema: { params: dripKeyParamSchema, body: testSendSchema } },
    async (request) => ({ data: await testDripStep(request, request.params.key, request.body) }),
  );

  server.get<{ Params: IdParam }>(
    "/orgs/:id/customer-messages",
    { schema: { params: idParamSchema } },
    async (request) => orgCustomerMessages(request.params.id),
  );

  server.get("/engage/wa-templates", async () => senderTemplates());

  server.get<{ Querystring: z.infer<typeof pageQuerySchema> }>(
    "/engage/broadcasts",
    { schema: { querystring: pageQuerySchema } },
    async (request) => listBroadcasts(request.query.page, request.query.pageSize),
  );

  server.post<{ Body: BroadcastInput }>(
    "/engage/broadcasts",
    { schema: { body: broadcastInputSchema } },
    async (request) => ({ data: await createBroadcast(request, request.body) }),
  );

  // Before /:id so the static segment wins.
  server.post<{ Body: AudiencePreviewInput }>(
    "/engage/broadcasts/audience",
    { config: { staffReadOnly: true }, schema: { body: audiencePreviewSchema } },
    async (request) => ({ data: await previewAudience(request.body.audience) }),
  );

  server.get<{ Params: IdParam }>(
    "/engage/broadcasts/:id",
    { schema: { params: idParamSchema } },
    async (request) => ({ data: await getBroadcast(request.params.id) }),
  );

  server.put<{ Params: IdParam; Body: BroadcastInput }>(
    "/engage/broadcasts/:id",
    { schema: { params: idParamSchema, body: broadcastInputSchema } },
    async (request) => ({ data: await updateBroadcast(request, request.params.id, request.body) }),
  );

  server.delete<{ Params: IdParam }>(
    "/engage/broadcasts/:id",
    { schema: { params: idParamSchema } },
    async (request) => ({ data: await deleteBroadcast(request, request.params.id) }),
  );

  server.get<{ Params: IdParam }>(
    "/engage/broadcasts/:id/preview",
    { schema: { params: idParamSchema } },
    async (request) => ({ data: await previewBroadcast(request, request.params.id) }),
  );

  server.post<{ Params: IdParam; Body: TestSendInput }>(
    "/engage/broadcasts/:id/test",
    { schema: { params: idParamSchema, body: testSendSchema } },
    async (request) => ({ data: await testBroadcast(request, request.params.id, request.body) }),
  );

  server.post<{ Params: IdParam; Body: ScheduleInput }>(
    "/engage/broadcasts/:id/schedule",
    { schema: { params: idParamSchema, body: scheduleSchema } },
    async (request) => ({
      data: await scheduleBroadcast(request, request.params.id, request.body),
    }),
  );

  server.post<{ Params: IdParam }>(
    "/engage/broadcasts/:id/unschedule",
    { schema: { params: idParamSchema } },
    async (request) => ({ data: await unscheduleBroadcast(request, request.params.id) }),
  );
}
