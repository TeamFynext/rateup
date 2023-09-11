import { FastifyReply, FastifyRequest } from "fastify";
import Session from "supertokens-node/recipe/session";
import { Prisma } from '@prisma/client';
import { CreateLandingThemeInput, GetLandingThemeInput, updateLandingTheme } from "./landingTheme.schema";
import { UpdateLandingTheme, createLandingTheme, getLandingThemeByLandingId } from "./landingTheme.service";


//------------create survey landing handler--------------
export async function createLandingThemeHandler(
    request: FastifyRequest<{
      Body: CreateLandingThemeInput;
      // Params: GetLandingThemeInput;
    }>,
    reply: FastifyReply
  ) {
    const data = request.body;
  
    try {
      let session = await Session.getSession(request, reply);
      let userId = session.getUserId();

      const LandingTheme = await createLandingTheme(data);
      reply.code(201).send(LandingTheme);
    } catch (e) {
      console.error(e);
      reply.code(500).send();
    }
  }

  //-----------get welocome by landing id-------------
  export async function getLandingThemeByIdHandler(
    request: FastifyRequest<{
      Params: GetLandingThemeInput;
    }>,
    reply: FastifyReply
  ) {
    try {
      // console.log("7768",request.params.id)
      const LandingTheme = await getLandingThemeByLandingId(request.params.id);
      if (!LandingTheme) {
        reply.code(404);
      } else {
        reply.send(LandingTheme);
      }
    } catch (e) {
      reply.code(500);
    }
  }

  //-------------update welcome styles------------
  export async function updateSurveyByIdHandler(
    request: FastifyRequest<{
      Params: GetLandingThemeInput;
      Body: updateLandingTheme;
    }>,
    reply: FastifyReply
  ) {
    try {
      const data = request.body;
      // TODO add types for session
      //const userId = request.session.getUserId();
     
      let themeId = request.params.id

      // console.log(data,">>>moopan",themeId)
  
      // console.log(data, ">>>data survey controller---");
      const survey = await UpdateLandingTheme(themeId,data);
      reply.code(201).send(survey);
    } catch (e) {
      console.error(e);
      reply.code(500).send();
    }
  }