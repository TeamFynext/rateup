import type { ReactNode } from "react";
import { createContext, useContext } from "react";

import type { SurveyThemePage } from "@/components/Survey/SurveyTheme/surveyThemeReducer.ts";

/**
 * The survey renderer's theme payload: the same JSON the theme editor writes,
 * one entry per themed page ("surveyTheme", "welcomeTheme", …). The editor's
 * `SurveyThemePage` is the single model for a page's blocks — the renderer and
 * the editor read the same document, so they share it.
 */
export type SurveyTheme = Record<string, SurveyThemePage>;

const SurveyThemeContext = createContext<SurveyTheme | null>(null);

function SurveyThemeContextProvider({
  surveyThemeObj,
  children,
}: {
  surveyThemeObj: SurveyTheme;
  children: ReactNode;
}) {
  return (
    <SurveyThemeContext.Provider value={surveyThemeObj}>{children}</SurveyThemeContext.Provider>
  );
}

function useSurveyThemeData() {
  return useContext(SurveyThemeContext);
}

export { useSurveyThemeData, SurveyThemeContextProvider };
