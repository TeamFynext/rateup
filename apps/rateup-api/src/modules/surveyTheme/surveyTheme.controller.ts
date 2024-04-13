import { FastifyRequest, FastifyReply } from "fastify";
import {
  createNewThemeInDB,
  deleteThemeInDB,
  getAllThemesOfUserOrgFromDB,
  getSurveyThemeById,
  updateSurveyThemeActiveSurveyThemeInDB,
  renameThemeInDB,
  // getSurveyThemeBySurveyId,
} from "./surveyTheme.service";
import { log } from "../../utils/logger";

export async function getSurveyThemeByIdHandler(
  request: FastifyRequest<{ Params: { webSurveyThemeId: string } }>,
  reply: FastifyReply,
) {
  const { webSurveyThemeId } = request.params;
  const { theme } = await getSurveyThemeById(webSurveyThemeId);
  reply.code(200).send(theme);
}

export async function getAllThemesOfUserOrg(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  let themes = await getAllThemesOfUserOrgFromDB(request);
  if (themes) {
    themes = themes.map((themeObj) => {
      const tempThemeObj = { ...themeObj };
      delete tempThemeObj.survey;
      if (themeObj.survey.length) {
        return {
          ...tempThemeObj,
          activeInAnotherSurvey: true,
        };
      } else {
        return {
          ...tempThemeObj,
          activeInAnotherSurvey: false,
        };
      }
    });
  }
  reply.code(200).send(themes);
}

export async function updateSurveyThemeHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const surveyTheme = await updateSurveyThemeActiveSurveyThemeInDB(request);
  reply.send(surveyTheme);
}

export async function createNewTheme(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    const newThemeObj = await createNewThemeInDB(request);
    reply.code(201).send(newThemeObj);
  } catch (err) {
    if (err.code === "P2002") {
      reply.code(400).send({
        success: false,
        message: "A theme with the same name already exists.",
      });
    } else {
      throw err;
    }
  }
}

export async function renameTheme(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  if (!request.body["name"]) {
    reply.code(400).send({
      success: false,
      message: "There should be new name of theme in request body.",
    });
    return;
  }
  const updatedTheme = await renameThemeInDB(request);
  reply.code(200).send(updatedTheme);
}

export async function deleteTheme(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const deletedTheme = await deleteThemeInDB(request);
  reply.code(200).send({
    success: true,
    message: "theme deleted successfully",
  });
}

export function errorHandler(
  error: any,
  request: FastifyRequest,
  reply: FastifyReply,
) {
  log.error(error);
  reply.status(500).send({ message: "Something went wrong" });
}
