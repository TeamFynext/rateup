import { useMemo } from "react";

interface ButtonStateParams {
  url?: string;
  example?: string | string[];
}

interface ButtonState {
  isWebSurvey: boolean;
  hasVariableInUrl: boolean;
  showInsertIcon: boolean;
  totalFields: number;
  combinedLength: number;
}

export const useButtonState = ({ url = "", example }: ButtonStateParams): ButtonState => {
  return useMemo(() => {
    const isWebSurvey = Array.isArray(example)
      ? example.length > 0 && example[0]?.startsWith(":")
      : typeof example === "string" && example.startsWith(":");

    const hasVariableInUrl = url.includes("{{");
    const showInsertIcon = !isWebSurvey && !hasVariableInUrl;

    const urlLength = url.length;
    const exampleLength = typeof example === "string" ? example.length : 0;
    const combinedLength = urlLength + exampleLength;

    const totalFields = isWebSurvey ? 4 : hasVariableInUrl ? 2 : 4;
    return {
      isWebSurvey,
      hasVariableInUrl,
      showInsertIcon,
      totalFields,
      combinedLength,
    };
  }, [url, example]);
};
