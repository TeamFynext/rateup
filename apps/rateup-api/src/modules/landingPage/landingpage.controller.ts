import { FastifyReply, FastifyRequest } from "fastify";
import Session from "supertokens-node/recipe/session";
import { Prisma } from '@prisma/client';
import { GetSurveyLandingByIdParams } from "../survey/survey.schema";
import { GetLandingPageByIdParams, UpdateLandingPageInput } from "./landingpage.schema";
import { deleteLandingPageById, getLandingPageById, updateLandingPageById } from "./landingpage.service";


//---------delete landing page by id -----------
export async function deleteSLandingPageByIdHandler(
    request: FastifyRequest<{
      Params: GetLandingPageByIdParams;
    }>,
    reply: FastifyReply
  ) {
    try {
      //------check if landing page exist ----
      const LandingPage = await getLandingPageById(request.params.id);
      if (!LandingPage) {
        reply.code(404);
      } else {
        //--------deleting landing page-----
        await deleteLandingPageById(request.params.id);
        reply.code(200);
      }
    } catch (e) {
      console.log(e);
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2003') {
        reply.code(400).send({
          error: 'Cannot delete Landing Page because it has associated responses. Cleanup responses and Try Again!'
        });
      } else {
        reply.code(500).send({
          error: 'An unknown error occurred.'
        });
      }
    }
  }

  //-------------update landing page -----------
  export async function updateLandingPageByIdHandler(
    request: FastifyRequest<{
      Params: GetLandingPageByIdParams;
      Body: UpdateLandingPageInput;
    }>,
    reply: FastifyReply
  ) {
    try {
      // TODO: By using prisma error codes, we can return 404 if the survey doesn't exist and remove this check.
      const survey = await getLandingPageById(request.params.id);
      if (!survey) {
        reply.code(404);
      } else {
        await updateLandingPageById(request.params.id, request.body);
        reply.code(200);
      }
    } catch (e) {
      console.log(e);
      reply.code(500);
    }
  }