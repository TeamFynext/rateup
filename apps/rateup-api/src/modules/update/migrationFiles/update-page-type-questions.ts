import { cloneDeep } from "lodash";
import prisma from "../../../utils/prisma";
import util from "util";
import { PageType } from "../../../types/enums";
import { getQuestionsArrUpdatedWithLanguageTypeQuestion } from "../../question/question.utils";

async function updatePageTypeQuestionsInDB() {
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

  allSurveys.forEach(async ({ id, webSurveyThemeId, questions, languages }) => {
    const themeObj = await prisma.webSurveyTheme.findFirst({
      where: {
        id: webSurveyThemeId,
      },
      select: {
        theme: true,
      },
    });
    if (themeObj) {
      const theme: any = themeObj.theme;
      const {
        welcomeTheme: {
          button: { label: welcomePageStartBtnLabel },
          subtitle: { subtitle: welcomePageSubtitle },
          title: { title: welcomePageTitle },
        },
        languageTheme: {
          title: { title: languagePageTitle },
          subtitle: { subtitle: languagePageSubtitle },
          button: { label: languagePageStartBtnLabel },
        },
        thankyouTheme: {
          subtitle: { subtitle: thankyouPageSubtitle },
          title: { title: thankyouPageTitle },
        },
      } = theme;

      const updatedQuestionsArr =
        await getQuestionsArrUpdatedWithLanguageTypeQuestion(
          questions,
          languages,
        );

      const welcomePageQuestionIndex = updatedQuestionsArr.findIndex(
        (questionObj) => questionObj.type === (PageType.Welcome as string),
      );
      const languagePageQuestionIndex = updatedQuestionsArr.findIndex(
        (questionObj) => questionObj.type === (PageType.Language as string),
      );
      const thankyouPageQuestionIndex = updatedQuestionsArr.findIndex(
        (questionObj) => questionObj.type === (PageType.ThankYou as string),
      );

      if (welcomePageQuestionIndex >= 0) {
        const welcomePageQuestionObj =
          updatedQuestionsArr[welcomePageQuestionIndex];
        welcomePageQuestionObj["titleText"] = welcomePageTitle;
        welcomePageQuestionObj["subtitleText"] = welcomePageSubtitle;
        welcomePageQuestionObj["startButtonText"] = welcomePageStartBtnLabel;
      }

      if (languagePageQuestionIndex >= 0) {
        const languagePageQuestionObj =
          updatedQuestionsArr[languagePageQuestionIndex];
        languagePageQuestionObj["titleText"] = languagePageTitle;
        languagePageQuestionObj["subtitleText"] = languagePageSubtitle;
        languagePageQuestionObj["startButtonText"] = languagePageStartBtnLabel;
      }

      if (thankyouPageQuestionIndex >= 0) {
        const thankyouPageQuestionObj =
          updatedQuestionsArr[thankyouPageQuestionIndex];
        thankyouPageQuestionObj["titleText"] = thankyouPageTitle;
        thankyouPageQuestionObj["subtitleText"] = thankyouPageSubtitle;
      }

      await prisma.survey.update({
        where: {
          id,
        },
        data: {
          questions: updatedQuestionsArr,
        },
      });
    }
  });
}

export { updatePageTypeQuestionsInDB };
