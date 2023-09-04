import { FastifyReply, FastifyRequest } from "fastify";
import Session from "supertokens-node/recipe/session";
import { Prisma } from '@prisma/client';
import { CreateWelcomeThemeInput, GetWelcomeThemeInput, updateWelomeTheme } from "./welcometheme.schema";
import { UpdateWelcomeTheme, createWelomeTheme, getWelcomeThemeBySurveyId } from "./welcometheme.service";


//------------create survey landing handler--------------
export async function createWelcomeThemeHandler(
    request: FastifyRequest<{
      Body: CreateWelcomeThemeInput;
      // Params: GetWelcomeThemeInput;
    }>,
    reply: FastifyReply
  ) {
    const data = request.body;
  
    try {
      // TODO add types for session
      //const userId = request.session.getUserId();
      let session = await Session.getSession(request, reply);
      let userId = session.getUserId();

      // let surveyid = request.params.id
      // data.surveyid = surveyid
      // console.log(data, ">>>data survey controller---");
      //---------pass survey id todo-------
      // console.log(req)
      const WelcomeTheme = await createWelomeTheme(data);
      reply.code(201).send(WelcomeTheme);
    } catch (e) {
      console.error(e);
      reply.code(500).send();
    }
  }

  //-----------get welocome by landing id-------------
  export async function getWelcomeThemeByIdHandler(
    request: FastifyRequest<{
      Params: GetWelcomeThemeInput;
    }>,
    reply: FastifyReply
  ) {
    try {
      // console.log("7768",request.params.id)
      const welcomeTheme = await getWelcomeThemeBySurveyId(request.params.id);
      if (!welcomeTheme) {
        reply.code(404);
      } else {
        reply.send(welcomeTheme);
      }
    } catch (e) {
      reply.code(500);
    }
  }

  //-------------update welcome styles------------
  export async function updateSurveyByIdHandler(
    request: FastifyRequest<{
      Params: GetWelcomeThemeInput;
      Body: updateWelomeTheme;
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
      const survey = await UpdateWelcomeTheme(themeId,data);
      reply.code(201).send(survey);
    } catch (e) {
      console.error(e);
      reply.code(500).send();
    }
  }