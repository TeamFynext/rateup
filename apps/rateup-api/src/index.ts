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
import { teamRoutes } from "./modules/team/team.route";
import { teamSchemas } from "./modules/team/team.schema";

const server = Fastify({
  logger,
});

supertokens.init(SuperTokensConfig);

server.register(cors, {
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  allowedHeaders: ["Content-Type", ...supertokens.getAllCORSHeaders()],
  credentials: true,
});

server.get("/ping", async () => {
  return { message: "pong!" };
});

async function main() {
  //TODO move this schema stuff to somewhere else
  const modules = [surveySchemas, questionSchemas, orgSchemas, teamSchemas];
  for (const module of modules) {
    for (const schema of module) {
      server.addSchema(schema);
    }
  }
  server.register(surveyRoutes, { prefix: "api/survey" });
  server.register(questionRoutes, { prefix: "api/question/:surveyId" });
  server.register(orgRoutes, { prefix: "api/org" });
  server.register(teamRoutes, { prefix: "api/team" });

  // await server.register(formDataPlugin);
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
      // TODO: make port & host env variables?
      console.log(`Server ready at ${port}`);
    })
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}

main();
