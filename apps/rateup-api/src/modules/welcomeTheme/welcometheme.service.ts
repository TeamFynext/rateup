import prisma from "../../utils/prisma";
import { CreateWelcomeThemeInput, GetWelomeThemeSurvey } from "./welcometheme.schema";

//--------------get survey welcome page by surveyTeamMapId
export async function getWelcomeThemeBySurveyTeamMapId(surveyTeamMapId: string) {

  const survey = await prisma.surveyTeamMap.findFirst({
    where: {
      id: surveyTeamMapId,
    },
  });

  if (!survey) {
    throw new Error(`Could not find survey with map id ${surveyTeamMapId}`);
  } else{
    const welcomeTheme = await prisma.welcomeTheme.findFirst({
      where: {
        surveyId : survey?.surveyId
      },
    });
  
    if (!welcomeTheme) {
      throw new Error(`Could not find welcomeTheme with id ${survey?.surveyId}`);
    }
    return welcomeTheme;

  }  
}

//--------------get survey welcome page by survey id

export async function getWelcomeThemeBySurveyId(surveyId: string) {
  const welcomeTheme = await prisma.welcomeTheme.findFirst({
    where: {
      surveyId,
    },
  });
  if (!welcomeTheme) {
    throw new Error(`Could not find welcomeTheme with id ${surveyId}`);
  }
  return welcomeTheme;
}

export async function createWelcomeTheme(
  input: GetWelomeThemeSurvey
) {
  const survey = await prisma.welcomeTheme.create({
    data: {
      ...input,
      headerText: input.headerText,
      descText: input.descText,
      buttonText: input.buttonText,
      headerStyles:input.headerStyles,
      descStyles:input.descStyles,
      buttonStyles:input.buttonStyles,
      bgStyles: input.bgStyles,
      logoStyles: input.logoStyles,
      surveyId: input.surveyId,
      // landingId: input.landingId,
      bgUrl: input.bgUrl,
      mobileBgUrl: input.mobileBgUrl,
      logoUrl: input.logoUrl,
      bgType: input.bgType,
    }

  });
  return survey;
}

export async function UpdateWelcomeTheme(
  themeId,
  input: CreateWelcomeThemeInput
) {
  const WelcomeTheme = await prisma.welcomeTheme.update({
    where: {
      id: themeId,
    },
    data: input,
  });
  return WelcomeTheme;
}
