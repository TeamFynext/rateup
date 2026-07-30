import type { ReactNode } from "react";
import { createContext, useContext } from "react";

/**
 * The survey renderer's theme payload: named style blocks keyed by element
 * (title, description, …). It is assembled dynamically and has no schema, so
 * unknown keys stay open.
 */
export interface SurveyThemeBlock {
  styles?: React.CSSProperties;
  primaryColor?: string;
  logo?: string;
  /** Any further per-element settings the theme editor writes. */
  [key: string]: React.CSSProperties | string | number | boolean | undefined;
}

export interface SurveyTheme {
  surveyTheme?: Record<string, SurveyThemeBlock | undefined>;
  [key: string]: Record<string, SurveyThemeBlock | undefined> | string | number | undefined;
}

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
