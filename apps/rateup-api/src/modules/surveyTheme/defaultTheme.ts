import { produce } from "immer";
import type { SurveyThemeJson } from "./utils.js";

const background = {
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
};
const logo = {
  logo: "",
  styles: {
    width: 50,
    height: 50,
  },
};
const title = {
  title: "",
  styles: {
    fontWeight: "700",
    fontSize: 30,
    textAlign: "center",
  },
};

const button = {
  label: "",
  styles: {
    backgroundColor: "#1C518E",
    color: "#FFFFFF",
    textAlign: "center",
  },
};

const input = {
  primaryColor: "#1C518E",
};

export const defaultTheme = {
  surveyTheme: {
    bg: background,
    title: {
      ...title,
      styles: { ...title.styles, textAlign: "left", fontSize: 20 },
      subtitleFontSize: 16,
    },
    button: button,
    input,
    logo: logo,
  },
};

export const defaultThemeOld: SurveyThemeJson = {
  welcomeTheme: {
    bg: {
      ...background,
    },
    title: {
      title: `<h3 style="text-align: center">Welcome</h3><p style="text-align: center">Welcome to the survey</p>`,
    },
    button: {
      ...button,
      label: "Start Survey",
      position: { x: "CENTER", y: "DEFAULT" },
    },
  },
  surveyTheme: {
    bg: background,
    title: {
      ...title,
      styles: { ...title.styles, textAlign: "left", fontSize: 20 },
      subtitleFontSize: 16,
    },
    button: button,
    input,
    logo: logo,
  },
  thankyouTheme: {
    bg: {
      ...background,
    },
    title: {
      title: `<h3 style="text-align: center">Thank you</h3><p style="text-align: center">Thank you for taking the survey</p>`,
    },
    confettiEnabled: false,
  },
  languageTheme: {
    bg: {
      ...background,
    },
    title: {
      title: `<h3 style="text-align: center">Select a Language</h3>`,
    },
    button: { ...button, label: "Start Survey" },
    input,
  },
};

export const defaultWebSurveyPagesTheme = produce(defaultThemeOld, (draft) => {
  delete draft.surveyTheme;
  draft.welcomeTheme!["useSurveyTheme"] = true;
  draft.languageTheme!["useSurveyTheme"] = true;
  draft.thankyouTheme!["useSurveyTheme"] = true;
});
