
import cors from "@fastify/cors";
import Fastify from "fastify";
import supertokens from "supertokens-node";
import { plugin } from "supertokens-node/framework/fastify";
import { logOptions } from "./utils/logger";
require("dotenv").config();

import { errorHandler } from "supertokens-node/framework/fastify";
import { SuperTokensConfig } from "./config";
import { registerRoutes } from "./registerRoutes";
import formDataPlugin from "@fastify/formbody";
import { parseArrayString } from "./utils/array";

const server = Fastify({
  logger: logOptions,
});

supertokens.init(SuperTokensConfig);

server.register(cors, {
  origin: [process.env.FRONTEND_URL, ...parseArrayString(process.env.CORS_WHITELIST).map((url) => new RegExp(url))],
  allowedHeaders: ["Content-Type", ...supertokens.getAllCORSHeaders()],
  credentials: true,
});

server.get("/api/ping", async () => {
  return { message: "pong!" };
});

async function main() {
  registerRoutes(server);

  await server.register(formDataPlugin);
  await server.register(plugin);
  server.setErrorHandler(errorHandler());
  const port: number = parseInt(process.env.PORT || "3001");
  const host: string = process.env.HOST || "0.0.0.0";
  server
    .listen({
      port: port,
      host: host,
    })
    .then(() => {
      console.log(`Server ready at ${port}`);
    })
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}

main();
