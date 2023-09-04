import prisma, { excludeFields } from "../../utils/prisma";
import { CreateWelcomeThemeInput, GetWelomeThemeSurvey } from "./welcometheme.schema";

//--------------get landing page by id
export async function getWelcomeThemeBySurveyId(surveyId: string) {
  // console.log("ento 7778");
  const welcomeTheme = await prisma.welcomeTheme.findFirst({
    where: {
      surveyId,
    },
  });
  // console.log(welcomeTheme, ">>istanbilll");

  if (!welcomeTheme) {
    throw new Error(`Could not find welcomeTheme with id ${surveyId}`);
  }
  return welcomeTheme;
}

export async function createWelomeTheme(
  input: GetWelomeThemeSurvey
) {

  // console.log(input,">>>>looped")
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
  // console.log(input,">>info667")
  const WelcomeTheme = await prisma.welcomeTheme.update({
    where: {
      id: themeId,
    },
    data: input,
  });
  return WelcomeTheme;
}
