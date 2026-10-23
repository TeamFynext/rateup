import type { FastifyInstance, FastifyRequest } from "fastify";
import fastifyMultipart from "@fastify/multipart";
import type { FastifyRouteSchemaDef } from "fastify/types/schema.js";
import { validatorCompiler } from "fastify-type-provider-zod";
import type { ZodType } from "zod";

import { errorEnvelopeSchema, externalErrorResponses } from "../../shared/errors.js";
import { externalRateLimit } from "../../shared/rateLimit.js";
import { declareExternalScopes } from "../../shared/scopes.js";
import * as C from "./waTemplates.controller.js";
import { MULTIPART_FILE_LIMIT } from "./mediaUpload.js";
import * as S from "./waTemplates.schema.js";

/** Sends can also fail upstream: WhatsApp unreachable is a 502, not our 500. */
const sendErrorResponses = { ...externalErrorResponses, 502: errorEnvelopeSchema };

/**
 * Every send is a paid WhatsApp message, so a test key may not reach it. An Idempotency-Key is
 * optional but recommended: with one a retry replays instead of sending twice.
 */
const paidSend = { paid: true } as const;

/**
 * send-with-file's body schema is for the reference only: the multipart stream is still unread
 * when Fastify validates, and the handler checks each field as it arrives. Every other part
 * (headers, params) validates as usual.
 */
function validateAllButBody(route: FastifyRouteSchemaDef<unknown>) {
  if (route.httpPart === "body") return (data: unknown) => ({ value: data });
  // Every schema on these routes is a zod schema; Fastify only types it as unknown here.
  return validatorCompiler({ ...route, schema: route.schema as ZodType });
}

export async function externalWaTemplateRoutes(server: FastifyInstance) {
  const TAG = ["WhatsApp/Template"];
  declareExternalScopes(server, { read: "templates.read", write: "inbox.reply" });

  // Streaming: no `attachFieldsToBody`, so nothing is buffered. The send-with-file handler
  // reads the parts itself; the file ceiling is the largest header type's cap (plus a byte)
  // and each type's own cap is enforced while the file streams (mediaUpload.ts).
  await server.register(fastifyMultipart, {
    limits: {
      fileSize: MULTIPART_FILE_LIMIT,
      files: 1,
      fields: 20,
      fieldSize: 64 * 1024,
      parts: 21,
    },
    throwFileSizeLimit: true,
  });

  // One bucket for both single-send routes (same key); a factory so each route infers its
  // own request type.
  const singleSendLimit = <R extends FastifyRequest>() =>
    externalRateLimit<R>({ max: 600, windowSeconds: 60, key: "extTemplateSend", failClosed: true });

  server.get(
    "/",
    {
      schema: {
        tags: TAG,
        summary: "List templates",
        description: "The org's WhatsApp templates, newest first.",
        querystring: S.templateListQuerySchema,
        response: { 200: S.templateListSchema, ...externalErrorResponses },
      },
    },
    C.listTemplatesHandler,
  );

  server.post(
    "/send",
    {
      config: { permission: "inbox.reply", ...paidSend },
      schema: {
        tags: TAG,
        summary: "Send a template to a phone number",
        description:
          "Sends an approved template by name. `phone` is digits with the country code, no `+` (`919876543210`). Pass " +
          "`scheduleInMinutes` (15 or more) to send later instead.",
        body: S.sendTemplateBodySchema,
        response: { 200: S.sendResultSchema, ...sendErrorResponses },
      },
      preHandler: [singleSendLimit()],
    },
    C.sendTemplateHandler,
  );

  server.post(
    "/send-with-file",
    {
      config: { permission: "inbox.reply", ...paidSend },
      schema: {
        tags: TAG,
        summary: "Send a template with an uploaded header file",
        description:
          "**Send every text field before the file part**: the file is streamed to WhatsApp " +
          "as it arrives, so a field after it is refused. The Idempotency-Key cannot cover " +
          "the file, so use a fresh key for every distinct send.",
        consumes: ["multipart/form-data"],
        body: S.sendWithFileFormSchema,
        response: { 200: S.sendResultSchema, ...sendErrorResponses },
      },
      preHandler: [singleSendLimit()],
      validatorCompiler: validateAllButBody,
    },
    C.sendTemplateWithFileHandler,
  );

  server.post(
    "/:templateId/send/contacts",
    {
      // A WhatsApp send like the others, so the WhatsApp feature covers it; a campaign key can too.
      config: { permission: ["inbox.reply", "campaigns.send"], ...paidSend },
      schema: {
        tags: TAG,
        summary: "Send a template to contacts",
        description:
          "Sends to up to 1000 of the org's contacts and answers once every send has been " +
          "tried. Per-contact failures are listed in `failed`; ids that are not the org's " +
          "contacts, or have no phone, in `skipped`.",
        params: S.templateIdParamsSchema,
        body: S.sendToContactsBodySchema,
        response: { 200: S.sendToContactsResultSchema, ...sendErrorResponses },
      },
      preHandler: [
        externalRateLimit({
          max: 30,
          windowSeconds: 60,
          key: "extTemplateSendContacts",
          failClosed: true,
        }),
      ],
    },
    C.sendToContactsHandler,
  );

  server.get(
    "/messages/:messageId/status",
    {
      config: { permission: "inbox.read" },
      schema: {
        tags: TAG,
        summary: "Get a message's delivery status",
        description: "For a `messageId` a send returned.",
        params: S.messageIdParamsSchema,
        response: { 200: S.messageStatusSchema, ...externalErrorResponses },
      },
    },
    C.getMessageStatusHandler,
  );
}
