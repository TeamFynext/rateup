import "dotenv/config";
import { LogController } from "fastify";
import { build } from "./app.js";

/**
 * API service entrypoint — HTTP only, safe to run at N replicas.
 *
 * BullMQ consumers and cron jobs run in the worker service (src/worker.ts).
 */
async function start() {
  const server = await build({
    // logger: true,
    logController: new LogController({ disableRequestLogging: true }),
    bodyLimit: 30971520,
    trustProxy: true,
    connectionTimeout: 60_000,
    keepAliveTimeout: 65_000,
    requestTimeout: 30_000,
  });

  process.on("unhandledRejection", (reason) => {
    server.log.error(reason, "Unhandled promise rejection");
  });

  process.on("uncaughtException", (err) => {
    server.log.error(err, "Uncaught exception");
    process.exit(1);
  });

  const shutdown = async (signal: string) => {
    server.log.info(`Received ${signal}, shutting down gracefully`);
    try {
      await server.close();
      process.exit(0);
    } catch (err) {
      server.log.error(err, "Error during graceful shutdown");
      process.exit(1);
    }
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));

  try {
    const port = Number.parseInt(process.env.PORT || "3001", 10);
    const host = process.env.HOST || "::";

    await server.listen({ port, host });
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
}

start();

export default start;
