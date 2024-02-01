import { SurveyTheme } from "@prisma/client";
import prisma from "../../utils/prisma";
import { defaultTheme } from "./defaultTheme";
import { surveyThemeSchemaCore } from "./surveyTheme.schema";

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

export async function exportData() {
  const welcomeThemes = await prisma.welcomeTheme.findMany();
  let finalObjArr = [];
  welcomeThemes.map(
    ({
      id,
      createdAt,
      updatedAt,
      surveyId,
      bgStyles,
      bgUrl,
      mobileBgUrl,
      logoUrl,
      logoStyles,
      buttonStyles,
      buttonText,
      descStyles,
      descText,
      headerText,
      headerStyles,
    }) => {
      let tempObj: surveyThemeSchemaCore & SurveyTheme = {
        ...defaultTheme,
        ...{
          id,
          createdAt,
          updatedAt,
          surveyId,
          welcomeTheme: {
            bg: {
              desktopbg: bgUrl,
              mobilebg: mobileBgUrl,
              styles: bgStyles,
            },
            logo: {
              logo: logoUrl,
              styles: logoStyles,
            },
            title: {
              title: headerText,
              styles: headerStyles,
            },
            subtitle: {
              subtitle: descText,
              styles: descStyles,
            },
            button: {
              label: buttonText,
              styles: buttonStyles,
            },
          },
        },
      };
      finalObjArr.push(tempObj);
    },
  );
  await prisma.surveyTheme.createMany({
    data: finalObjArr,
  });
}
