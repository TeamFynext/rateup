import { produce } from "immer";
import prisma from "../../../utils/prisma";
import { defaultWebSurveyPagesTheme } from "../../surveyTheme/defaultTheme";
import util from "util";

async function updateWebSurveyPagesThemeInDB() {
  const allSurveys = await prisma.survey.findMany({
    select: {
      id: true,
      webSurveyThemeId: true,
      welcomePageEnabled: true,
      questions: true,
      languages: true,
    },
    where: {
      type: "web",
    },
  });
  allSurveys.forEach(async ({ id, webSurveyThemeId }) => {
    if (webSurveyThemeId) {
      const themeObj = await prisma.webSurveyTheme.findFirst({
        where: {
          id: webSurveyThemeId,
        },
        select: {
          theme: true,
        },
      });

      const theme = themeObj?.theme;
      if (theme) {
        const newWebSurveyPagesTheme = produce(themeObj?.theme, (draft) => {
          delete draft["surveyTheme"];
          const welcomeThemeUseSurveyBgValue =
            draft["welcomeTheme"].bg.useSurveyBackground;
          const thankyouThemeUseSurveyBgValue =
            draft["thankyouTheme"].bg.useSurveyBackground;
          const languageThemeUseSurveyBgValue =
            draft["languageTheme"].bg.useSurveyBackground;

          delete draft["welcomeTheme"].bg.useSurveyBackground;
          delete draft["thankyouTheme"].bg.useSurveyBackground;
          delete draft["languageTheme"].bg.useSurveyBackground;

          if (welcomeThemeUseSurveyBgValue) {
            draft["welcomeTheme"].useSurveyTheme = true;
          } else {
            draft["welcomeTheme"].useSurveyTheme = false;
          }

          if (thankyouThemeUseSurveyBgValue) {
            draft["thankyouTheme"].useSurveyTheme = true;
          } else {
            draft["thankyouTheme"].useSurveyTheme = false;
          }

          if (languageThemeUseSurveyBgValue) {
            draft["languageTheme"].useSurveyTheme = true;
          } else {
            draft["languageTheme"].useSurveyTheme = false;
          }
        });

        await prisma.survey.update({
          where: {
            id,
          },
          data: {
            webSurveyPagesTheme: newWebSurveyPagesTheme,
          },
        });
      }
    }
  });
}

export { updateWebSurveyPagesThemeInDB };
