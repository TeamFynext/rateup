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
  });

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
