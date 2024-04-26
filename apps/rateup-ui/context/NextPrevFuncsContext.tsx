import { createContext, useContext } from "react";
import { SelectedQContext } from "./SelectedQ";

const NextPrevFuncsAndLastQuestionContext = createContext({
  nextFn: null,
  prevFn: null,
  isLastQuestion: false,
});

function NextPrevFuncsAndLastQuestionContextProvider({
  nextFn,
  prevFn,
  survey,
  children,
}) {
  const { selectedQ } = useContext(SelectedQContext);
  const endSurveyActions = selectedQ.logic?.filter(
    (obj) => obj.action === "EndSurvey",
  );
  const isLastQuestion =
    survey?.questions?.indexOf(selectedQ) === survey?.questions?.length - 1 ||
    endSurveyActions?.length > 0;
  return (
    <NextPrevFuncsAndLastQuestionContext.Provider
      value={{
        nextFn,
        prevFn,
        isLastQuestion,
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
