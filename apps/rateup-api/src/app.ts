import Fastify, { FastifyInstance, FastifyServerOptions } from "fastify";
import { log } from "./utils/logger.js";
import { registerPlugins } from "./plugins/index.js";
import { registerRoutes } from "./registerRoutes.js";
import { serializerCompiler, validatorCompiler } from "fastify-type-provider-zod";

export async function build(opts: FastifyServerOptions = {}): Promise<FastifyInstance> {
  const server = Fastify({
    loggerInstance: log,
    ...opts,
  });
  server.setValidatorCompiler(validatorCompiler);
  server.setSerializerCompiler(serializerCompiler);
  // Register all plugins
  await registerPlugins(server);

  // Register all routes
  server.after(async () => {
    await registerRoutes(server);
  });

  return server;
}

export default build;
