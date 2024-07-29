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
}) {
  const { selectedQ } = useContext(SelectedQContext);
  const endSurveyActions = selectedQ.logic?.filter(
    (obj) => obj.action === "EndSurvey",
  );

  const isFirstQuestion = isWelcomePageEnabled
    ? isLanguagePageEnabled
      ? survey?.questions?.findIndex((Q) => selectedQ.id === Q.id) === 2
      : survey?.questions?.findIndex((Q) => selectedQ.id === Q.id) === 1
    : survey?.questions?.findIndex((Q) => selectedQ.id === Q.id) === 0;

  const isLastQuestion = isThankYouPageEnabled
    ? survey?.questions?.findIndex((Q) => selectedQ.id === Q.id) ===
      survey?.questions?.length - 2
    : survey?.questions?.findIndex((Q) => selectedQ.id === Q.id) ===
      survey?.questions?.length - 1;

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
