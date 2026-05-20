import { createContext, useContext } from "react";

const SurveyThemeContext = createContext(null);

function SurveyThemeContextProvider({ surveyThemeObj, children }) {
  return (
    <SurveyThemeContext.Provider value={surveyThemeObj}>
      {children}
    </SurveyThemeContext.Provider>
  );
}

function useSurveyThemeData() {
  return useContext(SurveyThemeContext);
}

export { useSurveyThemeData, SurveyThemeContextProvider };
