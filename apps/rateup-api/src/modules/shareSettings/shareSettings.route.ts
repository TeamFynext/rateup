import { onRouteHookHandler, preHandlerHook } from "./shareSettings.hooks.js";
import { getSettings, updateSettings } from "./shareSettings.controller.js";
import { onFile } from "./utils.js";
import multipart from "@fastify/multipart";

async function routes(fastify, options) {
  fastify.register(multipart, { attachFieldsToBody: "keyValues", onFile });
  fastify.addHook("onRoute", onRouteHookHandler);
  fastify.addHook("preHandler", preHandlerHook);

  fastify.get("/:resourceName/:id", getSettings);
  fastify.put("/:resourceName/:id", updateSettings);
}

export default routes;
