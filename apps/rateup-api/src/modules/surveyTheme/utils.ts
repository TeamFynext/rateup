import loadash from "lodash";

type ThemeStyles = Record<string, unknown>;

/** Background of a single device, as stored after conversion. */
interface DeviceBg {
  chooseBgRadioInputValue: string;
  imageUrl: string;
  bgColor: string;
}

/**
 * A page background is stored either in the legacy flat form (`desktopbg` /
 * `mobilebg` strings) or in the converted per-device form — this type covers
 * both, which is exactly what convertBgObjToReqStructure migrates between.
 */
interface ThemeBg {
  desktopbg?: string;
  mobilebg?: string;
  desktopBg?: DeviceBg;
  mobileBg?: DeviceBg;
  useSurveyBackground?: boolean;
  styles?: ThemeStyles;
}

interface ThemeSection {
  bg?: ThemeBg;
  logo?: { logo: string; styles?: ThemeStyles };
  title?: { title: string; styles?: ThemeStyles; subtitleFontSize?: number };
  subtitle?: { subtitle: string; styles?: ThemeStyles };
  button?: {
    label?: string;
    styles?: ThemeStyles;
    position?: { x: string; y: string };
  };
  input?: { primaryColor: string };
  confettiEnabled?: boolean;
  useSurveyTheme?: boolean;
  // convertBgObjToReqStructure looks up a top-level "button" section and strips
  // its border radius, so a section can carry styles of its own.
  styles?: ThemeStyles;
}

/**
 * The stored theme JSON: a bag of page sections (welcomeTheme, surveyTheme,
 * thankyouTheme, languageTheme). The index signature is what lets the
 * converters walk every page generically.
 */
export interface SurveyThemeJson {
  [sectionName: string]: ThemeSection | undefined;
}

/**
 * Prisma types the `theme` column as JsonValue; every row holds a theme object.
 * Anything else is handed on as an empty object, so the property access in the
 * converters still throws the same TypeError it always did.
 */
const isSurveyThemeJson = (value: unknown): value is SurveyThemeJson =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export const toSurveyThemeJson = (value: unknown): SurveyThemeJson =>
  isSurveyThemeJson(value) ? value : {};

const addSurveyThemeLogoObjIfNotPresent = (payloadCopy: SurveyThemeJson) => {
  if ((payloadCopy["welcomeTheme"]!.logo?.logo?.length ?? 0) > 0) {
    payloadCopy.surveyTheme!.logo = payloadCopy["welcomeTheme"]!.logo;
  } else {
    payloadCopy.surveyTheme!.logo = {
      logo: "",
      styles: {
        width: 50,
        height: 50,
      },
    };
  }
  const logo = payloadCopy.surveyTheme!.logo!.logo;
  if (logo.length > 0 && (!logo.startsWith("http://") || !logo.startsWith("https://"))) {
    payloadCopy.surveyTheme!.logo!.logo = `http://d2uj946b0i8y27.cloudfront.net/${logo}`;
  }
};

export const getImgUrl = (str: string | null | undefined) => {
  const urlStr = str || "";

  let resultStr = "";

  if (urlStr.startsWith("https://") || urlStr.startsWith("http://")) {
    resultStr = urlStr;
  } else if (urlStr.length > 0 && !urlStr.startsWith("#")) {
    resultStr = `http://d2uj946b0i8y27.cloudfront.net/${urlStr}`;
  }
  return resultStr;
};

const getChooseBgRadioValue = (urlStr: string | undefined) => {
  const str = getImgUrl(urlStr);
  if (str.startsWith("https://") || str.startsWith("http://")) {
    return "image";
  } else {
    return "color";
  }
};

const convertBgObjToReqStructure = (payloadCopy: SurveyThemeJson) => {
  for (const key in payloadCopy) {
    const bgObj = payloadCopy[key]!.bg!;
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
      delete payloadCopy["button"].styles!.borderRadius;
    }

    payloadCopy[key]!.bg = resultBgObj;
  }
};

export const verifyAndConvertSurveyThemeObj = (surveyTheme: SurveyThemeJson) => {
  const surveyThemeCopy = loadash.cloneDeep(surveyTheme);
  if (
    surveyTheme["surveyTheme"]!.bg!.hasOwnProperty("desktopbg") &&
    surveyTheme["surveyTheme"]!.bg!.hasOwnProperty("mobilebg")
  ) {
    const desktopBg = surveyTheme["surveyTheme"]!.bg!.desktopbg;
    const mobileBg = surveyTheme["surveyTheme"]!.bg!.mobilebg;
    const isBgObjInReqStructure = typeof desktopBg === "object" && typeof mobileBg === "object";
    const surveyThemeLogoKeyPresent = surveyTheme["surveyTheme"]!.logo;

    if (!isBgObjInReqStructure || !surveyThemeLogoKeyPresent) {
      if (!isBgObjInReqStructure) convertBgObjToReqStructure(surveyThemeCopy);
      if (!surveyThemeLogoKeyPresent) addSurveyThemeLogoObjIfNotPresent(surveyThemeCopy);
    }
  }

  delete surveyThemeCopy["welcomeTheme"]!["logo"];
  delete surveyThemeCopy["thankyouTheme"]!["logo"];

  if (!surveyTheme["welcomeTheme"]!.button!.position) {
    surveyThemeCopy["welcomeTheme"]!.button!.position = {
      x: "CENTER",
      y: "DEFAULT",
    };
  }

  if (
    typeof surveyTheme["welcomeTheme"]!.bg!.useSurveyBackground !== "boolean" ||
    typeof surveyTheme["thankyouTheme"]!.bg!.useSurveyBackground !== "boolean"
  ) {
    // use survey background checkbox will be present in webpage theme and thankyou page theme background editor, for that useSurveyBackground is being used.
    surveyThemeCopy["welcomeTheme"]!.bg!.useSurveyBackground = true;
    surveyThemeCopy["thankyouTheme"]!.bg!.useSurveyBackground = true;
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
