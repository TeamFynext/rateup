"use client";

import { createContext, useContext } from "react";

const IsSurveyThemePreviewContext = createContext(false);
const IsSurveyThemeEditViewContext = createContext(false);

function IsSurveyThemePreviewContextProvider({
  isSurveyThemePreview,
  isSurveyThemeEditView,
  children,
}) {
  return (
    <IsSurveyThemePreviewContext.Provider value={isSurveyThemePreview}>
      <IsSurveyThemeEditViewContext.Provider value={isSurveyThemeEditView}>
        {children}
      </IsSurveyThemeEditViewContext.Provider>
    </IsSurveyThemePreviewContext.Provider>
  );
}

export default IsSurveyThemePreviewContextProvider;

function useIsSurveyThemePreview() {
  return useContext(IsSurveyThemePreviewContext);
}

function useIsSurveyThemeEditView() {
  return useContext(IsSurveyThemeEditViewContext);
}

export { useIsSurveyThemePreview, useIsSurveyThemeEditView };
