import { createContext, useContext } from "react";

import {
  getFirstQuestion,
  getLastQuestion,
} from "@/components/Survey/TakeSurvey/TakeSurveyComponent/util.tsx";

import { SelectedQContext } from "./SelectedQ.ts";

const NextPrevFuncsAndLastQuestionContext = createContext({
  nextFn: null,
  prevFn: null,
  isLastQuestion: false,
  isFirstQuestion: false,
});

function NextPrevFuncsAndLastQuestionContextProvider({ nextFn, prevFn, survey, children }) {
  const { selectedQ } = useContext(SelectedQContext);

  const firstQuestion = getFirstQuestion(survey);
  const lastQuestion = getLastQuestion(survey);

  const isFirstQuestion = firstQuestion?.id === selectedQ?.id;
  const isLastQuestion = lastQuestion?.id === selectedQ?.id;

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
