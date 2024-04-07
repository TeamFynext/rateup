import { defaultTheme } from "./src/modules/surveyTheme/defaultTheme";
import prisma from "./src/utils/prisma";

async function PopulateSavedThemeTable() {
  console.log("started adding theme data to saveThemeTable");
  const surveyThemes = await prisma.surveyTheme.findMany({
    select: {
      surveyId: true,
      welcomeTheme: true,
      surveyTheme: true,
      thankyouTheme: true,
      survey: {
        select: {
          title: true,
          user: {
            select: {
              org: true,
            },
          },
        },
      },
    },
  });

  const surveyThemesObjsInRequiredFormat = surveyThemes.map(
    (
      {
        surveyId,
        welcomeTheme,
        surveyTheme,
        thankyouTheme,
        survey: {
          title,
          user: { org },
        },
      },
      index,
    ) => {
      return {
        surveyId,
        orgId: org[0].id,
        name: `${title}-${index} Theme`,
        theme: {
          welcomeTheme,
          surveyTheme,
          thankyouTheme,
        },
      };
    },
  );

  for (const obj of surveyThemesObjsInRequiredFormat) {
    await createRecords(obj);
  }

  console.log("finished adding data to savedThemeTable");
}

async function createRecords(obj) {
  const { orgId, name, theme, surveyId } = obj;

  const defaultThemeOfCurrentOrg = await prisma.webSurveyTheme.findFirst({
    where: {
      orgId,
      name: "Default Theme",
    },
  });
  if (!defaultThemeOfCurrentOrg) {
    await prisma.webSurveyTheme.create({
      data: {
        orgId,
        name: "Default Theme",
        theme: defaultTheme,
      },
    });
  }
  // created WebSurveyTheme records.
  const { id: webSurveyThemeId } = await prisma.webSurveyTheme.create({
    data: {
      orgId,
      name,
      theme,
    },
  });

  // set savedThemeId of survey to above created record id.
  await prisma.survey.update({
    where: {
      id: surveyId,
    },
    data: {
      webSurveyThemeId,
    },
  });
}

export { PopulateSavedThemeTable };
