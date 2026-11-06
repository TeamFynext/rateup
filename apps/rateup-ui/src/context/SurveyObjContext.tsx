import type { ReactNode } from "react";
import { createContext, useContext } from "react";

const SurveyContext = createContext<Survey | null>(null);

function SurveyContextProvider({ survey, children }: { survey: Survey; children: ReactNode }) {
  return <SurveyContext.Provider value={survey}>{children}</SurveyContext.Provider>;
}

function useSurveyContext() {
  return useContext(SurveyContext);
}

export { SurveyContextProvider, useSurveyContext };
