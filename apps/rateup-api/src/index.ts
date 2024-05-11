require("dotenv").config();

import cors from "@fastify/cors";
import Fastify from "fastify";
import supertokens from "supertokens-node";
import { plugin } from "supertokens-node/framework/fastify";
import { errorHandler } from "supertokens-node/framework/fastify";
import { SuperTokensConfig, swaggerConfig } from "./config";
import { registerRoutes } from "./registerRoutes";
import formDataPlugin from "@fastify/formbody";
import { parseArrayString } from "./utils/array";
import { log, logOptions } from "./utils/logger";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import fastifyCron from "fastify-cron";
import { resetMonthlyCounts } from "./modules/stats/stats.service";

const server = Fastify({
  logger: logOptions,
  //TODO this is a temporary fix for the large payload error issue
  bodyLimit: 30971520,
});

// req.body is not serialized at the time of logging. So adding a hook to log the body
// just before the request is processed
server.addHook("preHandler", async (req, _rep) => {
  // log body
  if (req.body) {
    log.trace("Request body for id %s: %o", req.id, req.body);
  }
});

server.register(require("@fastify/websocket"));

supertokens.init(SuperTokensConfig);

server.register(cors, {
  origin: [
    process.env.ELECTION_APP_URL,
    process.env.FRONTEND_URL,
    ...parseArrayString(process.env.CORS_WHITELIST).map(
      (url) => new RegExp(url),
    ),
  ],
  allowedHeaders: ["Content-Type", ...supertokens.getAllCORSHeaders()],
  credentials: true,
});

server.get("/api/ping", async (req, reply) => {
  try {
    reply.send({ message: "pong" });
  } catch (e) {
    log.error(e);
    reply.status(500).send({ message: "error" });
  }
});

server.register(fastifyCron, {
  jobs: [
    {
      cronTime: "0 0 1 * *", // This cron expression means "at 00:00 on day-of-month 1"
      onTick: async () => {
        try {
          await resetMonthlyCounts();
          // console.log("Monthly Stats reset successfully");
        } catch (error) {
          console.error("Failed to reset monthly counts:", error);
        }
      },
      start: true, // Start the job immediately
      timeZone: "Asia/Kolkata", // UTC India

      // timeZone: 'UTC', // Specify the timezone if necessary
      //  cronTime: '* * * * *', // Every minute - for testing purpose
    },
  ],
});

server.register(formDataPlugin);
server.register(plugin);
server.setErrorHandler(errorHandler());
async function main() {
  const port: number = parseInt(process.env.PORT || "3001");
  const host: string = process.env.HOST || "0.0.0.0";
  server
    .listen({
      port: port,
      host: host,
    })
    .then(() => {
      console.log(`Server ready at ${port}`);
      server.cron.startAllJobs();
    })
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });

  if (process.env.SWAGGER == "1") {
    server.after(() => {
      server.register(swagger, swaggerConfig);
      server.register(swaggerUi, {
        routePrefix: "/docs",
        uiConfig: {
          defaultModelsExpandDepth: -1,
        },
      });
      log.trace("Swagger registered. Exposing docs at /docs");
    });
  }

  server.after(() => {
    registerRoutes(server);
  });

  if (process.env.SWAGGER == "1") {
    await server.ready();
    server.swagger();
  }
}

if (require.main === module) {
  main();
}

export default server;
