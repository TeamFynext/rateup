import { SurveyTheme } from "@prisma/client";
import { surveyThemeSchemaCore } from "./surveyTheme.schema";

const background = {
  desktopbg: "",
  mobilebg: "",
  styles: {
    backgroundColor: "#f7f7f7",
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
const subtitle = {
  subtitle: "",
  styles: {
    fontWeight: "400",
    fontSize: 15,
    textAlign: "center",
  },
};
const button = {
  label: "",
  styles: {
    backgroundColor: "#1C518E",
    color: "#FFFFFF",
    textAlign: "center",
    borderRadius: 18,
  },
  position: { x: "CENTER", y: "DEFAULT" },
};

export const defaultTheme = {
  welcomeTheme: {
    bg: background,
    logo: logo,
    title: { ...title, title: "Welcome" },
    subtitle: { ...subtitle, subtitle: "Welcome to the survey" },
    button: { ...button, label: "Start Survey" },
  },
  surveyTheme: {
    bg: background,
    title: {
      ...title,
      styles: { ...title.styles, textAlign: "left", fontSize: 20 },
    },
    subtitle: {
      ...subtitle,
      styles: { ...subtitle.styles, textAlign: "left" },
    },
    button: button,
    input: {
      primaryColor: "#1C518E",
    },
    orgLogoEnabled: true,
  },
  thankyouTheme: {
    bg: background,
    logo: logo,
    title: { ...title, title: "Thank you" },
    subtitle: { ...subtitle, subtitle: "Thank you for taking the survey" },
    confettiEnabled: false,
  },
};
