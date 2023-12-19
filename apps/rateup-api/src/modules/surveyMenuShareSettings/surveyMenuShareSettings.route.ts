import { onRouteHookHandler, preHandlerHook } from "./surveyMenuShareSettings.hooks";
import { getSettings, updateSettings } from "./surveyMenuShareSettings.controller";
import { onFile } from "./utils";
import multipart from "@fastify/multipart";

async function routes(fastify, options) {

  fastify.register(multipart, { attachFieldsToBody: 'keyValues', onFile });
  fastify.addHook("onRoute", onRouteHookHandler);
  fastify.addHook("preHandler", preHandlerHook);

  fastify.get("/:resourceName/:id", getSettings);
  fastify.put("/:resourceName/:id", updateSettings);
}
  
export default routes;