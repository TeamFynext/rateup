import { createContext, useState, Dispatch, SetStateAction } from "react";
import { SurveyTheme } from "./surveyTheme.types";
import { PreviewTypeEnum } from "./SurveyTheme.enums";

export const SurveyThemeContext = createContext({
  surveyTheme: {} as SurveyTheme,
  setSurveyTheme: {} as Dispatch<SetStateAction<SurveyTheme>>,
  mobileOrDesktop: PreviewTypeEnum.DESKTOP,
  setMobileOrDesktop: {} as Dispatch<SetStateAction<PreviewTypeEnum>>,
});
export default function SurveyThemeContextProvider(props: any) {
  const [surveyTheme, setSurveyTheme] = useState<SurveyTheme>(
    props.surveyTheme,
  );

  const { mobileOrDesktop, setMobileOrDesktop } = props;
  return (
    <SurveyThemeContext.Provider
      value={{
        surveyTheme,
        setSurveyTheme,
        mobileOrDesktop,
        setMobileOrDesktop,
      }}
    >
      {props.children}
    </SurveyThemeContext.Provider>
  );
}
