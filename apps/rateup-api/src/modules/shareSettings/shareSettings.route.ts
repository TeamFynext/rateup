import { preHandlerHook } from "./shareSettings.hooks.js";
import { getSettings, updateSettings } from "./shareSettings.controller.js";
import { MAX_LOGO_BYTES, onFile } from "./utils.js";
import multipart from "@fastify/multipart";
import { bodySchema, paramsSchema, responseSchema } from "./shareSettings.schema.js";
import { FastifyInstance } from "fastify";

async function routes(fastify: FastifyInstance) {
  // The plugin was registered with no `limits`, so no fileSize, files or
  // fieldSize bound applied and the part was fully buffered in memory before
  // anything looked at it — a large upload was an allocation of that size per
  // request. See issues.txt 35.3.
  fastify.register(multipart, {
    attachFieldsToBody: "keyValues",
    onFile,
    limits: { fileSize: MAX_LOGO_BYTES, files: 1, fields: 16, fieldSize: 4096 },
  });
  fastify.addHook("preHandler", preHandlerHook);

  fastify.get(
    "/:resourceName/:id",
    {
      schema: {
        params: paramsSchema,
        response: {
          "2xx": responseSchema,
        },
      },
    },
    getSettings,
  );
  fastify.put(
    "/:resourceName/:id",
    {
      schema: {
        consumes: ["multipart/form-data"],
        params: paramsSchema,
        body: bodySchema,
        response: {
          "2xx": responseSchema,
        },
      },
    },
    updateSettings,
  );
}

export default routes;
