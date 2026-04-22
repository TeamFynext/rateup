import { FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import formDataPlugin from "@fastify/formbody";
import supertokens from "supertokens-node";
import {
  plugin,
  errorHandler,
} from "supertokens-node/framework/fastify/index.js";
import { SuperTokensConfig } from "../config.js";
import { parseArrayString } from "../utils/array.js";
import { registerCronJobs } from "./cron.js";
import { registerSwagger } from "./swagger.js";
import { registerKafka } from "./kafka.js";
import registerWorkers from "../jobs/index.js";

export async function registerPlugins(server: FastifyInstance) {
  // SuperTokens initialization
  supertokens.init(SuperTokensConfig);
  await server.register(formDataPlugin);

  await server.register(plugin);

  server.setErrorHandler(errorHandler() as any);

  server.addHook("onSend", async (request, reply, payload) => {
    const location = reply.getHeader("location");

    if (
      location &&
      request.url.includes("/api/auth/callback/apple") &&
      reply.statusCode === 200
    ) {
      reply.code(303);
    }

    return payload;
  });

  // CORS
  await server.register(cors, {
    origin: [
      process.env.ELECTION_APP_URL,
      process.env.FRONTEND_URL,
      ...parseArrayString(process.env.CORS_WHITELIST).map(
        (url) => new RegExp(url),
      ),
    ],
    allowedHeaders: ["Content-Type", ...supertokens.getAllCORSHeaders()],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true,
  });

  // WebSocket
  await server.register(import("@fastify/websocket"));

  // Form data

  // SuperTokens plugin

  // Error handler

  // Kafka producer
  await registerKafka(server);

  // Initialize BullMQ workers
  await registerWorkers();

  // Cron jobs
  await registerCronJobs(server);

  // Swagger (only if enabled)
  if (process.env.SWAGGER === "1") {
    await registerSwagger(server);
  }
}
