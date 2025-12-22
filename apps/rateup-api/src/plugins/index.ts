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

export async function registerPlugins(server: FastifyInstance) {
  // SuperTokens initialization
  supertokens.init(SuperTokensConfig);

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
  await server.register(formDataPlugin);

  // SuperTokens plugin
  await server.register(plugin);

  // Error handler
  server.setErrorHandler(errorHandler() as any);

  // Kafka producer
  await registerKafka(server);

  // Cron jobs
  await registerCronJobs(server);

  // Swagger (only if enabled)
  if (process.env.SWAGGER === "1") {
    await registerSwagger(server);
  }
}
