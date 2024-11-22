import { isNumber } from "lodash";
import { PageType, SurveyType } from "../../../types/enums";
import prisma from "../../../utils/prisma";

export async function updateWebSurveyPagesThemeTitle() {
  const surveys = await prisma.survey.findMany({
    where: { type: SurveyType.Web },
  });
  await Promise.all(
    surveys.map(async (survey) => {
      const themePages = survey.questions.filter((q) =>
        [PageType.Welcome, PageType.ThankYou, PageType.Language].includes(
          q.type as unknown as PageType,
        ),
      );
      const theme = { ...(survey.webSurveyPagesTheme as JSON) };
      const updatedQuestions = [...survey.questions];

      for (const page of themePages) {
        const themeObj = theme[getThemekey(page.type as unknown as PageType)];
        const titleStyles = getInlineStyleFromStyleObj(
          themeObj["title"].styles,
        );
        const newPage = { ...page };
        if (newPage["subtitleText"]) {
          const subtitleStyles = getInlineStyleFromStyleObj(
            themeObj["subtitle"].styles,
          );
          newPage["titleText"] =
            `<p style="text-align:center;"><span style="${titleStyles}">${newPage["titleText"]}</span></p><p style="text-align:center;"><span style="${subtitleStyles}">${newPage["subtitleText"]}</span></p>`;
          delete newPage["subtitleText"];
        } else {
          newPage["titleText"] =
            `<p style="text-align:center;"><span style="${titleStyles}">${newPage["titleText"]}</span></p>`;
        }
        theme[getThemekey(page.type as unknown as PageType)].title.title =
          newPage["titleText"];
        delete theme[getThemekey(page.type as unknown as PageType)].title
          .styles;
        delete theme[getThemekey(page.type as unknown as PageType)].subtitle;

        const index = updatedQuestions.findIndex((q) => q.id === page.id);
        updatedQuestions[index] = newPage;
      }
      await prisma.survey.update({
        where: {
          id: survey.id,
        },
        data: {
          questions: updatedQuestions,
          webSurveyPagesTheme: theme,
        },
      });
    }),
  );
}

function getThemekey(pageType: PageType) {
  switch (pageType) {
    case PageType.Welcome:
      return "welcomeTheme";
    case PageType.Language:
      return "languageTheme";
    case PageType.ThankYou:
      return "thankyouTheme";
  }
}

function getInlineStyleFromStyleObj(styles) {
  if (!styles) return "text-align:center";
  let newStyles = [];
  for (const key in styles) {
    const kebabKey = key.replace(/([A-Z])/g, "-$1").toLowerCase();
    const value = isNumber(styles[key]) ? `${styles[key]}px` : `${styles[key]}`;
    newStyles.push(`${kebabKey}:${value}`);
  }
  return newStyles.join(";") + ";";
}
