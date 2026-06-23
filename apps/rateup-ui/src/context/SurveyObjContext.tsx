import { createContext, useContext } from "react";

const SurveyContext = createContext(null);

function SurveyContextProvider({ survey, children }) {
  return (
    <SurveyContext.Provider value={survey}>{children}</SurveyContext.Provider>
  );
}

function useSurveyContext() {
  return useContext(SurveyContext);
}

export { SurveyContextProvider, useSurveyContext };
