import { FastifyInstance } from "fastify";
import { $Sref } from "./landingpage.schema";
import { getLandingPageByIdHandler, getSurveyBylandingIdhandler } from "../survey/survey.controller";

export async function landingPagePublicRoutes(server: FastifyInstance) {
  

  // get survey by landingid
  server.get(
    "/surveys/:id",
    {
        schema: {
            params: $Sref("getLandingPageByIdParamsSchema"),
          },
    },
    getSurveyBylandingIdhandler
  );

  // get landingpage by id
  server.get(
    "/:id",
    {
      //----------to do ------verify access to landingpage session
      schema: {
        params: $Sref("getLandingPageByIdParamsSchema"),
      },
    },
    getLandingPageByIdHandler
  );

  
  }
