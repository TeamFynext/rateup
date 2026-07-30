import type { ReactNode } from "react";
import { createContext, useContext } from "react";

/**
 * The survey renderer's theme payload: named style blocks keyed by element
 * (title, description, …). It is assembled dynamically and has no schema, so
 * unknown keys stay open.
 */
/** A background layer (desktop or mobile) inside the theme's `bg` block. */
export interface SurveyThemeBackground {
  bgColor?: string;
  bgImageSrc?: string;
  [key: string]: string | undefined;
}

export interface SurveyThemeBlock {
  styles?: React.CSSProperties;
  primaryColor?: string;
  logo?: string;
  desktopBg?: SurveyThemeBackground;
  mobileBg?: SurveyThemeBackground;
  /** Any further per-element settings the theme editor writes. */
  [key: string]:
    | React.CSSProperties
    | SurveyThemeBackground
    | SurveyThemeBlock
    | string
    | number
    | boolean
    | undefined;
}

export interface SurveyTheme {
  /** Keyed by page ("surveyPage", "thankYouPage", …), then by element. */
  [key: string]: Record<string, SurveyThemeBlock | undefined> | undefined;
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
