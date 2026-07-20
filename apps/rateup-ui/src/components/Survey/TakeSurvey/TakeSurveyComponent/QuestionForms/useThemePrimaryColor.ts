import { useSurveyThemeData } from "@/context/SurveyThemeContext.tsx";

export function useThemePrimaryColor() {
  const surveyThemeData = useSurveyThemeData();
  const primaryColor = surveyThemeData?.surveyTheme?.input?.primaryColor;
  return primaryColor === "rateup-blue" || !primaryColor ? "#1C518E" : primaryColor;
}
