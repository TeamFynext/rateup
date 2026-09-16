import { FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import formDataPlugin from "@fastify/formbody";
import supertokens from "supertokens-node";
import { plugin, errorHandler } from "supertokens-node/framework/fastify/index.js";
import { SuperTokensConfig } from "../config.js";
import { parseCorsWhitelist } from "../utils/corsWhitelist.js";
import { registerSwagger } from "./swagger.js";
import { registerKafka } from "./kafka.js";

export async function registerPlugins(server: FastifyInstance) {
  // SuperTokens initialization
  supertokens.init(SuperTokensConfig);
  await server.register(formDataPlugin);

  await server.register(plugin);

  server.setErrorHandler(errorHandler());

  server.addHook("onSend", async (request, reply, payload) => {
    const location = reply.getHeader("location");

    if (location && request.url.includes("/api/auth/callback/apple") && reply.statusCode === 200) {
      reply.code(303);
    }

    return payload;
  });

  // CORS. Exact origins only — see parseCorsWhitelist for why these are no longer
  // compiled to regexes.
  const allowedOrigins: string[] = [process.env.ELECTION_APP_URL, process.env.FRONTEND_URL].filter(
    (origin): origin is string => origin !== undefined,
  );
  allowedOrigins.push(...parseCorsWhitelist(process.env.CORS_WHITELIST));

  await server.register(cors, {
    origin: allowedOrigins,
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

  // NOTE: BullMQ consumers and cron jobs deliberately do NOT live here. They run in
  // the separate worker service (src/worker.ts) so the API can be scaled to N
  // replicas without every replica firing the same cron tick N times.

  // The OpenAPI spec is always generated and served as JSON; the browsable UI is what
  // SWAGGER=1 gates. See `plugins/swagger.ts`.
  await registerSwagger(server);
}
