import type { SurveyTheme } from "@/context/SurveyThemeContext.tsx";

function getBgImgAndBgColor(
  surveyThemeData: SurveyTheme | null,
  surveyThemeObjKey: string,
  isMobile: boolean,
) {
  if (!surveyThemeData || Object.keys(surveyThemeData).length === 0 || !surveyThemeObjKey) {
    return {
      backgroundColor: "#f7f7f7",
      backgroundImageSrc: "",
    };
  }

  const bgObj = surveyThemeData?.[surveyThemeObjKey]?.bg;
  const desktopBgObj = bgObj?.desktopBg;
  const mobileBgObj = bgObj?.mobileBg;

  const {
    bgColor: desktopBgColor,
    chooseBgRadioInputValue: desktopChoosedBg,
    imageUrl: desktopBgImgUrl,
  } = desktopBgObj ?? {};

  const {
    bgColor: mobileBgColor,
    chooseBgRadioInputValue: mobileChoosedBg,
    imageUrl: mobileBgImgUrl,
  } = mobileBgObj ?? {};

  const bgColor = isMobile ? mobileBgColor : desktopBgColor;
  const bgImg = isMobile ? mobileBgImgUrl : desktopBgImgUrl;
  const choosedBg = isMobile ? mobileChoosedBg : desktopChoosedBg;

  return {
    backgroundColor: choosedBg === "color" ? bgColor : "#f7f7f7",
    backgroundImageSrc: choosedBg === "image" ? bgImg : "",
  };
}

export { getBgImgAndBgColor };
