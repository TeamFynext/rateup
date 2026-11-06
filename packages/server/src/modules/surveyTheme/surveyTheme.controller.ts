import { FastifyError, FastifyReply, FastifyRequest } from "fastify";
import { log } from "../../utils/logger.js";
import {
  createAndApplyThemeToSurvey,
  deleteThemeInDB,
  getAllThemesOfUserOrgFromDB,
  getSurveyThemeById,
  renameThemeInDB,
  ThemeAccessError,
  updateSurveyThemeActiveSurveyThemeInDB,
  type RenameThemeRequest,
  type ThemeIdParams,
  type UpdateActiveThemeRequest,
} from "./surveyTheme.service.js";

/**
 * ThemeAccessError and Prisma's P2025 both mean "not yours, or not there" — the
 * scoped where clauses cannot tell those apart, and neither should the response.
 */
function sendAccessFailure(reply: FastifyReply, error: unknown, context: string) {
  if (error instanceof ThemeAccessError) {
    reply.code(error.status).send({ success: false, message: error.message });
    return true;
  }
  if (error && typeof error === "object" && (error as { code?: string }).code === "P2025") {
    reply.code(404).send({ success: false, message: "Theme not found" });
    return true;
  }
  log.error({ err: error }, context);
  return false;
}

export async function getSurveyThemeByIdHandler(
  request: FastifyRequest<{ Params: { webSurveyThemeId: string } }>,
  reply: FastifyReply,
) {
  const { webSurveyThemeId } = request.params;
  const surveyTheme = await getSurveyThemeById(webSurveyThemeId);
  if (!surveyTheme) {
    return reply.code(404).send({ success: false, message: "Theme not found" });
  }
  reply.code(200).send(surveyTheme.theme);
}

export async function getAllThemesOfUserOrg(request: FastifyRequest, reply: FastifyReply) {
  let themes = await getAllThemesOfUserOrgFromDB(request);
  if (themes) {
    themes = themes.map((themeObj) => {
      const tempThemeObj = { ...themeObj };
      delete (tempThemeObj as Partial<typeof tempThemeObj>).survey;
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
  request: FastifyRequest<{
    Params: UpdateActiveThemeRequest["params"];
    Body: UpdateActiveThemeRequest["body"];
  }>,
  reply: FastifyReply,
) {
  try {
    const surveyTheme = await updateSurveyThemeActiveSurveyThemeInDB(request);
    reply.send(surveyTheme);
  } catch (err) {
    if (sendAccessFailure(reply, err, "Error updating survey theme")) return;
    throw err;
  }
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
    // Intentionally broad: any error-like object carrying a P2002 "code" is
    // reported as a duplicate name.
    if (typeof err === "object" && err !== null && "code" in err && err.code === "P2002") {
      reply.code(400).send({
        success: false,
        message: "A theme with the same name already exists.",
      });
    } else if (err instanceof ThemeAccessError) {
      reply.code(err.status).send({ success: false, message: err.message });
    } else {
      log.error({ err }, "Error creating survey theme");
      throw err;
    }
  }
}

export async function renameTheme(
  request: FastifyRequest<{ Params: ThemeIdParams; Body: RenameThemeRequest["body"] }>,
  reply: FastifyReply,
) {
  if (!request.body["name"]) {
    reply.code(400).send({
      success: false,
      message: "There should be new name of theme in request body.",
    });
    return;
  }
  try {
    const updatedTheme = await renameThemeInDB(request);
    reply.code(200).send(updatedTheme);
  } catch (err) {
    if (typeof err === "object" && err !== null && "code" in err && err.code === "P2002") {
      return reply
        .code(400)
        .send({ success: false, message: "A theme with the same name already exists." });
    }
    if (sendAccessFailure(reply, err, "Error renaming survey theme")) return;
    throw err;
  }
}

export async function deleteTheme(
  request: FastifyRequest<{ Params: ThemeIdParams }>,
  reply: FastifyReply,
) {
  try {
    await deleteThemeInDB(request);
    reply.code(200).send({
      success: true,
      message: "theme deleted successfully",
    });
  } catch (err) {
    if (sendAccessFailure(reply, err, "Error deleting survey theme")) return;
    throw err;
  }
}

export function errorHandler(error: FastifyError, request: FastifyRequest, reply: FastifyReply) {
  log.error(error);
  reply.status(500).send({ message: "Something went wrong" });
}
