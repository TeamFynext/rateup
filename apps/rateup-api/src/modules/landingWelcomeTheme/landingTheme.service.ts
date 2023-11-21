import prisma, { excludeFields } from "../../utils/prisma";
import { CreateLandingThemeInput, GetLandingThemeSurvey } from "./landingTheme.schema";

//--------------get landing page by id
export async function getLandingThemeByLandingId(landingId: string) {
  // console.log("ento 7778");
  const welcomeTheme = await prisma.welcomeTheme.findFirst({
    where: {
      landingId,
    },
  });
  // console.log(welcomeTheme, ">>istanbilll");

  if (!welcomeTheme) {
    throw new Error(`Could not find welcomeTheme with id ${landingId}`);
  }
  return welcomeTheme;
}

export async function createLandingTheme(
  input: GetLandingThemeSurvey
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
    //   surveyId: input.surveyId,
      landingId: input.landingId,
      bgUrl: input.bgUrl,
      mobileBgUrl: input.mobileBgUrl,
      logoUrl: input.logoUrl,
      bgType: input.bgType,
    }

  });
  return survey;
}

export async function UpdateLandingTheme(
  themeId,
  input: CreateLandingThemeInput
) {
  // console.log(input,">>info667")
  const LandingTheme = await prisma.welcomeTheme.update({
    where: {
      id: themeId,
    },
    data: input,
  });
  return LandingTheme;
}
