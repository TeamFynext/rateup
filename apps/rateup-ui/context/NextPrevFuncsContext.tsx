import { createContext, useContext } from "react";

import { SelectedQContext } from "./SelectedQ";

const NextPrevFuncsAndLastQuestionContext = createContext({
  nextFn: null,
  prevFn: null,
  isLastQuestion: false,
  isFirstQuestion: false,
});

function NextPrevFuncsAndLastQuestionContextProvider({
  nextFn,
  prevFn,
  survey,
  children,
  isWelcomePageEnabled,
  isThankYouPageEnabled,
  isLanguagePageEnabled,
  isGoogleReviewPageEnabled,
}) {
  const { selectedQ } = useContext(SelectedQContext);
  const endSurveyActions = selectedQ.logic?.filter(
    (obj) => obj.action === "EndSurvey",
  );

  const selectedQuestionIndex = survey?.questions?.findIndex(
    (Q) => selectedQ.id === Q.id,
  );

  const isFirstQuestion = isWelcomePageEnabled
    ? isLanguagePageEnabled
      ? selectedQuestionIndex === 2
      : selectedQuestionIndex === 1
    : selectedQuestionIndex === 0;

  let isLastQuestion = false;
  if (!isThankYouPageEnabled && !isGoogleReviewPageEnabled) {
    if (selectedQuestionIndex === survey?.questions?.length - 1) {
      isLastQuestion = true;
    }
  } else if (isThankYouPageEnabled && isGoogleReviewPageEnabled) {
    if (selectedQuestionIndex === survey?.questions?.length - 3) {
      isLastQuestion = true;
    }
  } else if (isThankYouPageEnabled || isGoogleReviewPageEnabled) {
    if (selectedQuestionIndex === survey?.questions?.length - 2) {
      isLastQuestion = true;
    }
  }

  return (
    <NextPrevFuncsAndLastQuestionContext.Provider
      value={{
        nextFn,
        prevFn,
        isLastQuestion,
        isFirstQuestion,
      }}
    >
      {children}
    </NextPrevFuncsAndLastQuestionContext.Provider>
  );
}

function useHandleNextPrevFuncs() {
  return useContext(NextPrevFuncsAndLastQuestionContext);
}

export { NextPrevFuncsAndLastQuestionContextProvider, useHandleNextPrevFuncs };
