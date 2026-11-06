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
