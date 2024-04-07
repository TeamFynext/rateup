import prisma from "../../utils/prisma";
import { defaultTheme } from "./defaultTheme";

// export async function getSurveyThemeBySurveyId(surveyId: string) {
//   return await prisma.webSurveyTheme.findUnique({
//     where: {
//       surveyId: surveyId,
//     },
//   });
// }

export async function getSurveyThemeById(webSurveyThemeId: string) {
  return await prisma.webSurveyTheme.findUnique({
    where: {
      id: webSurveyThemeId,
    },
  });
}

export async function getAllThemesOfUserOrgFromDB(req) {
  const { orgId } = req?.user;
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
  const { orgId } = req?.user;
  const { themeName } = req.body;
  return await prisma.webSurveyTheme.create({
    data: {
      orgId,
      name: themeName,
      theme: defaultTheme,
    },
  });
}

// export async function createDefaultSurveyTheme(surveyId: string) {
//   console.log("surveyId", surveyId);
//   return await prisma.webSurveyTheme.create({
//     data: { ...defaultTheme, ...{ surveyId: surveyId } },
//   });
// }

export async function updateSurveyThemeActiveSurveyThemeInDB(req) {
  const { webSurveyThemeId } = req.params;
  const { surveyId, theme } = req.body;
  const updatedTheme = await prisma.webSurveyTheme.update({
    where: {
      id: webSurveyThemeId,
    },
    data: {
      theme,
    },
  });
  const updatedSurvey = await prisma.survey.update({
    where: {
      id: surveyId,
    },
    data: {
      webSurveyThemeId,
    },
  });
  return updatedTheme;
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
