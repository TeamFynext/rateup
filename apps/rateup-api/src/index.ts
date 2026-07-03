import "dotenv/config";
import { build } from "./app.js";

/**
 * Run the server!
 */
async function start() {
  const server = await build({
    // logger: true,
    disableRequestLogging: true,
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

    // Start cron jobs if they exist
    if (server.cron) {
      server.cron.startAllJobs();
    }
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
}

start();

export default start;
