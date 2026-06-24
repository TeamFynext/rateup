import { PageType } from "@/types/enums.ts";

const getSurveyEditViewQuestions = (questionsArr) => {
  const isWelcomePageActive = questionsArr?.find((question) => question?.type === PageType.Welcome);
  const isLanguagePageActive = questionsArr?.find(
    (question) => question?.type === PageType.Language,
  );
  if (isWelcomePageActive && isLanguagePageActive) {
    return questionsArr.filter(
      (question) => question.type !== PageType.Welcome && question.type !== PageType.Language,
    );
  }
  if (isWelcomePageActive) {
    return questionsArr.filter((question) => question.type !== PageType.Welcome);
  }
  if (isLanguagePageActive) {
    return questionsArr.filter((question) => question.type !== PageType.Language);
  }
  return questionsArr;
};

export { getSurveyEditViewQuestions };
