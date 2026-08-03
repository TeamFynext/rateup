import { preHandlerHook } from "./shareSettings.hooks.js";
import { getSettings, updateSettings } from "./shareSettings.controller.js";
import { MAX_LOGO_BYTES, onFile } from "./utils.js";
import multipart from "@fastify/multipart";
import { bodySchema, paramsSchema, responseSchema } from "./shareSettings.schema.js";
import { FastifyInstance } from "fastify";

async function routes(fastify: FastifyInstance) {
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
