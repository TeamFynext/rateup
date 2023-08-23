import { FastifyInstance } from "fastify";
import { $Sref } from "./landingpage.schema";
import { getSurveyBylandingIdhandler } from "../survey/survey.controller";

export async function landingPagePublicRoutes(server: FastifyInstance) {
  

  // get survey by landingid
  server.get(
    "/surveys/:id",
    {
        schema: {
            params: $Sref("getLandingPageByIdParamsSchema"),
            // add response schema
            // response: {
            //   200: $Sref("getLandingpagePublicResponseSchema"),
            // }
          },
    },
    getSurveyBylandingIdhandler
  );

  
  }
