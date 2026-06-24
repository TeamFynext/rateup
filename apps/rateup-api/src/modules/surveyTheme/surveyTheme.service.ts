import { FastifyReply } from "fastify";
import prisma from "../../utils/prisma.js";
import { defaultTheme } from "./defaultTheme.js";
import { verifyAndConvertSurveyThemeObj } from "./utils.js";

export async function getSurveyThemeById(webSurveyThemeId: string) {
  return await prisma.webSurveyTheme.findUnique({
    where: {
      id: webSurveyThemeId,
    },
  });
}

export async function getAllThemesOfUserOrgFromDB(req) {
  const { orgId } = req?.user || {};
  return await prisma.webSurveyTheme.findMany({
    where: {
      orgId,
    },
    select: {
      name: true,
      id: true,
      theme: true,
      survey: {
        select: { title: true },
      },
    },
    orderBy: {
      createdAt: "asc",
    },
  });
}

export async function createNewThemeInDB(req) {
  const { orgId } = req?.user || {};
  const { themeName } = req.body;
  return await prisma.webSurveyTheme.create({
    data: {
      orgId,
      name: themeName,
      theme: defaultTheme,
    },
  });
}

export async function applyThemeToSurvey(surveyId: string, themeId) {
  await prisma.survey.update({
    where: {
      id: surveyId,
    },
    data: {
      webSurveyThemeId: themeId,
    },
  });
}

export async function createAndApplyThemeToSurvey(req) {
  const { orgId } = req?.user || {};
  const { themeName } = req.body;
  const surveyId = req.body.surveyId;
  return prisma.$transaction(async (tx) => {
    const newTheme = await tx.webSurveyTheme.create({
      data: {
        orgId,
        name: themeName,
        theme: defaultTheme,
      },
    });
    await tx.survey.update({
      where: {
        id: surveyId,
      },
      data: {
        webSurveyThemeId: newTheme.id,
      },
    });

    return newTheme;
  });
}

export async function renameThemeInDB(req) {
  const { webSurveyThemeId } = req.params;
  const body = req.body;
  const updatedTheme = await prisma.webSurveyTheme.update({
    where: {
      id: webSurveyThemeId,
    },
    data: {
      ...body,
    },
  });
  return updatedTheme;
}

export async function updateSurveyThemeActiveSurveyThemeInDB(req) {
  const { webSurveyThemeId } = req.params;
  const { surveyId, theme } = req.body;

  const themeObj = await prisma.webSurveyTheme.findFirst({
    where: {
      id: webSurveyThemeId,
    },
    select: {
      name: true,
    },
  });

  let updatedTheme = null;
  if (themeObj && themeObj.name !== "Default Theme") {
    updatedTheme = await prisma.webSurveyTheme.update({
      where: {
        id: webSurveyThemeId,
      },
      data: {
        theme,
      },
    });
  }

  await prisma.survey.update({
    where: {
      id: surveyId,
    },
    data: {
      webSurveyThemeId,
    },
  });

  if (updatedTheme) {
    return updatedTheme;
  } else {
    return {
      success: true,
      message: "Applied theme succesfully.",
    };
  }
}

export async function deleteThemeInDB(req) {
  const { webSurveyThemeId } = req.params;
  const deletedTheme = await prisma.webSurveyTheme.delete({
    where: {
      id: webSurveyThemeId,
    },
  });
  return deletedTheme;
}

export async function updateAllWebSurveyThemesInDB(_reply: FastifyReply) {
  try {
    const allThemes = await prisma.webSurveyTheme.findMany();
    await prisma.$transaction(async (tx) => {
      for (const themeObj of allThemes) {
        const { id, theme } = themeObj;
        const newThemeObj = verifyAndConvertSurveyThemeObj(theme);
        await tx.webSurveyTheme.update({
          where: {
            id,
          },
          data: {
            theme: newThemeObj,
          },
        });
      }
      return;
    });
    return allThemes;
  } catch (err) {
    console.log(err);
    throw err;
  }
}
