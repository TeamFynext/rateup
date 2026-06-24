import loadash from "lodash";

const addSurveyThemeLogoObjIfNotPresent = (payloadCopy) => {
  if (payloadCopy["welcomeTheme"].logo?.logo?.length > 0) {
    payloadCopy.surveyTheme.logo = payloadCopy["welcomeTheme"].logo;
  } else {
    payloadCopy.surveyTheme.logo = {
      logo: "",
      styles: {
        width: 50,
        height: 50,
      },
    };
  }
  const logo = payloadCopy.surveyTheme.logo.logo;
  if (logo.length > 0 && (!logo.startsWith("http://") || !logo.startsWith("https://"))) {
    payloadCopy.surveyTheme.logo.logo = `http://d2uj946b0i8y27.cloudfront.net/${logo}`;
  }
};

export const getImgUrl = (str) => {
  let urlStr = str;
  if (!str) urlStr = "";

  let resultStr = "";

  if (urlStr.startsWith("https://") || urlStr.startsWith("http://")) {
    resultStr = urlStr;
  } else if (urlStr.length > 0 && !urlStr.startsWith("#")) {
    resultStr = `http://d2uj946b0i8y27.cloudfront.net/${urlStr}`;
  }
  return resultStr;
};

const getChooseBgRadioValue = (urlStr) => {
  const str = getImgUrl(urlStr);
  if (str.startsWith("https://") || str.startsWith("http://")) {
    return "image";
  } else {
    return "color";
  }
};

const convertBgObjToReqStructure = (payloadCopy) => {
  for (const key in payloadCopy) {
    const bgObj = payloadCopy[key].bg;
    const desktopbg = bgObj.desktopbg;
    const mobilebg = bgObj.mobilebg;

    const desktopChooseBgRadioInputValue = getChooseBgRadioValue(desktopbg);
    const mobileChooseBgRadioInputValue = getChooseBgRadioValue(mobilebg);

    const resultBgObj = {
      desktopBg: {
        chooseBgRadioInputValue: desktopChooseBgRadioInputValue,
        imageUrl: getImgUrl(desktopbg),
        bgColor: desktopbg?.startsWith("#") ? desktopbg : "#f7f7f7",
      },
      mobileBg: {
        chooseBgRadioInputValue: mobileChooseBgRadioInputValue,
        imageUrl: getImgUrl(mobilebg),
        bgColor: mobilebg?.startsWith("#") ? mobilebg : "#f7f7f7",
      },
    };

    if (payloadCopy["button"]) {
      delete payloadCopy["button"].styles.borderRadius;
    }

    payloadCopy[key].bg = resultBgObj;
  }
};

export const verifyAndConvertSurveyThemeObj = (surveyTheme) => {
  const surveyThemeCopy = loadash.cloneDeep(surveyTheme);
  if (
    surveyTheme["surveyTheme"].bg.hasOwnProperty("desktopbg") &&
    surveyTheme["surveyTheme"].bg.hasOwnProperty("mobilebg")
  ) {
    const desktopBg = surveyTheme["surveyTheme"].bg.desktopbg;
    const mobileBg = surveyTheme["surveyTheme"].bg.mobilebg;
    const isBgObjInReqStructure = typeof desktopBg === "object" && typeof mobileBg === "object";
    const surveyThemeLogoKeyPresent = surveyTheme["surveyTheme"].logo;

    if (!isBgObjInReqStructure || !surveyThemeLogoKeyPresent) {
      if (!isBgObjInReqStructure) convertBgObjToReqStructure(surveyThemeCopy);
      if (!surveyThemeLogoKeyPresent) addSurveyThemeLogoObjIfNotPresent(surveyThemeCopy);
    }
  }

  delete surveyThemeCopy["welcomeTheme"]["logo"];
  delete surveyThemeCopy["thankyouTheme"]["logo"];

  if (!surveyTheme["welcomeTheme"].button.position) {
    surveyThemeCopy["welcomeTheme"].button.position = {
      x: "CENTER",
      y: "DEFAULT",
    };
  }

  if (
    typeof surveyTheme["welcomeTheme"].bg.useSurveyBackground !== "boolean" ||
    typeof surveyTheme["thankyouTheme"].bg.useSurveyBackground !== "boolean"
  ) {
    // use survey background checkbox will be present in webpage theme and thankyou page theme background editor, for that useSurveyBackground is being used.
    surveyThemeCopy["welcomeTheme"].bg.useSurveyBackground = true;
    surveyThemeCopy["thankyouTheme"].bg.useSurveyBackground = true;
  }

  if (!surveyTheme["languageTheme"]) {
    surveyThemeCopy["languageTheme"] = {
      bg: {
        desktopBg: {
          chooseBgRadioInputValue: "color",
          imageUrl: "",
          bgColor: "#f7f7f7",
        },
        mobileBg: {
          chooseBgRadioInputValue: "color",
          imageUrl: "",
          bgColor: "#f7f7f7",
        },
        useSurveyBackground: true,
      },
      title: {
        title: `<h3 style="text-align: center">Select a Language</h3>`,
      },
      input: {
        primaryColor: "#1C518E",
      },
      button: {
        label: "Start Survey",
        styles: {
          backgroundColor: "#1C518E",
          color: "#FFFFFF",
          textAlign: "center",
        },
      },
    };
  }

  return surveyThemeCopy;
};
