import prisma from "../../../utils/prisma";

async function updateGoogleReviewQuestionsInDB() {
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
  for (const survey of allSurveys) {
    const surveyId = survey?.id;
    const questions = survey?.questions;
    const newQuestionsArr = questions.map((question) => {
      if (Boolean(question.googleReview)) {
        question.reviewPageOptions = question.googleReview;
        question.reviewPagePlatform = "Google";
      }
      return question;
    });
    await prisma.survey.update({
      where: {
        id: surveyId,
      },
      data: {
        questions: newQuestionsArr,
      },
    });
  }
}

export { updateGoogleReviewQuestionsInDB };
