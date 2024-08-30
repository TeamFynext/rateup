//THIS is for DB & other Updations
//Temporary and will be removed later

import { FastifyInstance } from "fastify";
import { updateWebSurveyPagesTheme } from "./update.controller";
import { createHubSpotContactsForExistingUsers } from "./update.controller";

export async function updatePublicRoutes(server: FastifyInstance) {
  server.post("/create-hubspot-contact", createHubSpotContactsForExistingUsers);

  server.post("/updateWebSurveyPagesTheme", updateWebSurveyPagesTheme);
}
