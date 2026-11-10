import Fastify, { FastifyInstance, FastifyServerOptions } from "fastify";
import { log } from "./utils/logger.js";
import { registerPlugins } from "./plugins/index.js";
import { registerRoutes } from "./registerRoutes.js";
import { serializerCompiler, validatorCompiler } from "fastify-type-provider-zod";
import { rewriteLegacyUrl } from "./routes/legacyPaths.js";

export async function build(opts: FastifyServerOptions = {}): Promise<FastifyInstance> {
  const server = Fastify({
    loggerInstance: log,
    // Renamed API URLs: an old one is served by the route at its new URL (routes/legacyPaths.ts).
    rewriteUrl: rewriteLegacyUrl,
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
