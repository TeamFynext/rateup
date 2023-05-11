//index.ts

import Fastify from "fastify";
import { surveyRoutes } from "./modules/survey/survey.route";
import { logger } from "./utils/logger";
require("dotenv").config();
import { surveySchemas } from "./modules/survey/survey.schema";
import { questionSchemas } from "./modules/question/question.schema";
import { questionRoutes } from "./modules/question/question.route";
import supertokens from "supertokens-node";
import cors from "@fastify/cors";
import { plugin } from "supertokens-node/framework/fastify";

import { errorHandler } from "supertokens-node/framework/fastify";
import { SuperTokensConfig } from "./config";
import { orgRoutes } from "./modules/org/org.route";
import { orgSchemas } from "./modules/org/org.schema";

const server = Fastify({
  logger,
});

supertokens.init(SuperTokensConfig);

server.register(cors, {
  origin: "http://localhost:3000",
  allowedHeaders: ['Content-Type', ...supertokens.getAllCORSHeaders()],
  credentials: true,
});

server.get("/ping", async () => {
  return { message: "pong!" };
});

async function main() {
  //TODO move this schema stuff to somewhere else
  const modules = [surveySchemas, questionSchemas,orgSchemas];
  for (const module of modules) {
    for (const schema of module) {
      server.addSchema(schema);
    }
  }
  server.register(surveyRoutes, { prefix: "api/survey" });
  server.register(questionRoutes, { prefix: "api/question" });
  server.register(orgRoutes, { prefix: "api/org" });

 // await server.register(formDataPlugin);
  await server.register(plugin);
  server.setErrorHandler(errorHandler());


  server
    .listen({
      port: 3001,
      host: "0.0.0.0",
    })
    .then(() => {
      // TODO: make port & host env variables?
      console.log(`Server ready at ${""}`);
    })
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}

main();
