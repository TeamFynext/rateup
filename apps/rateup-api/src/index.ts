import Fastify from "fastify";
import { surveyRoutes } from "./modules/survey/survey.route";
import { logger } from "./utils/logger";
require("dotenv").config();
import { surveySchemas } from "./modules/survey/survey.schema";
import { questionSchemas } from "./modules/question/question.schema";
import { questionRoutes } from "./modules/question/question.route";

const server = Fastify({
  logger,
});

server.get("/ping", async () => {
  return { message: "pong!" };
});
async function main() {
  //TODO move this schema stuff to somewhere else
  const modules = [surveySchemas, questionSchemas];
  for (const module of modules) {
    for (const schema of module) {
      server.addSchema(schema);
    }
  }
  server.register(surveyRoutes, { prefix: "api/survey" });
  server.register(questionRoutes, { prefix: "api/question" });

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
