import { createContext, useContext } from "react";

const IsSurveyThemePreviewContext = createContext(false);

function IsSurveyThemePreviewContextProvider({ value, children }) {
  return (
    <IsSurveyThemePreviewContext.Provider value={value}>
      {children}
    </IsSurveyThemePreviewContext.Provider>
  );
}

export default IsSurveyThemePreviewContextProvider;

function useIsSurveyThemePreviewContext() {
  return useContext(IsSurveyThemePreviewContext);
}

export { useIsSurveyThemePreviewContext };
