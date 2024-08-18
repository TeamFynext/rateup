//THIS is for DB & other Updations
//Temporary and will be removed later

import { FastifyInstance } from "fastify";
import { updatePageTypeQuestions } from "./update.controller";

export async function updatePublicRoutes(server: FastifyInstance) {
  // updates welcome, language, thankyou pages inputs texts with active survey theme of the survey(to move the title, subtitle, start button texts from theme to page type question object).
  server.post("/updatePageTypeQuestions", updatePageTypeQuestions);
}
