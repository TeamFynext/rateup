import { FastifyReply, FastifyRequest } from "fastify";
import { log } from "../../utils/logger.js";
import {
  createAndApplyThemeToSurvey,
  deleteThemeInDB,
  getAllThemesOfUserOrgFromDB,
  getSurveyThemeById,
  renameThemeInDB,
  updateSurveyThemeActiveSurveyThemeInDB,
} from "./surveyTheme.service.js";

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
  request: FastifyRequest<{
    Body: {
      surveyId?: string;
      themeName: string;
    };
  }>,
  reply: FastifyReply,
) {
  try {
    const newThemeObj = await createAndApplyThemeToSurvey(request);
    reply.code(201).send(newThemeObj);
  } catch (err) {
    console.log(err);
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

// This function is used only, when there is a change in web survey theme json structure,
// to update theme json of all rows of webSurveyTheme table to the new Structure.
export async function updateAllWebSurveyThemesJson(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    // const allThemes = await updateAllWebSurveyThemesInDB(reply);
    reply.code(200).send({
      success: true,
      message:
        "No Json changes needed for now, if there is a need for json change check endpoint code",
    });
  } catch (err) {
    console.log(err);
    reply.status(500).send({ message: "Something went wrong" });
  }
}

export function errorHandler(
  error: any,
  request: FastifyRequest,
  reply: FastifyReply,
) {
  log.error(error);
  reply.status(500).send({ message: "Something went wrong" });
}
