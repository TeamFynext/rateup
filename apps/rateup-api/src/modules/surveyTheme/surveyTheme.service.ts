import prisma from "../../utils/prisma";
import { defaultTheme } from "./defaultTheme";

export async function getSurveyThemeBySurveyId(surveyId: string) {
  return await prisma.surveyTheme.findUnique({
    where: {
      surveyId: surveyId,
    },
  });
}

export async function getSurveyThemeById(surveyThemeId: string) {
  return await prisma.surveyTheme.findUnique({
    where: {
      id: surveyThemeId,
    },
  });
}

export async function createDefaultSurveyTheme(surveyId: string) {
  console.log("surveyId", surveyId);
  return await prisma.surveyTheme.create({
    data: { ...defaultTheme, ...{ surveyId: surveyId } },
  });
}

export async function updateSurveyTheme(
  surveyThemeId: string,
  surveyTheme: any,
) {
  return await prisma.surveyTheme.update({
    where: {
      id: surveyThemeId,
    },
    data: surveyTheme,
  });
}
