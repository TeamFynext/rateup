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
  },
};

const input = {
  primaryColor: "#1C518E",
};

export const defaultTheme = {
  welcomeTheme: {
    bg: {
      ...background,
      useSurveyBackground: true,
    },
    title: { ...title, title: "Welcome" },
    subtitle: { ...subtitle, subtitle: "Welcome to the survey" },
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
      useSurveyBackground: true,
    },
    title: { ...title, title: "Thank you" },
    subtitle: { ...subtitle, subtitle: "Thank you for taking the survey" },
    confettiEnabled: false,
  },
  languageTheme: {
    bg: {
      ...background,
      useSurveyBackground: true,
    },
    title: {
      title: "Select a Language",
      styles: {
        fontWeight: "300",
        fontSize: 34,
        textAlign: "center",
      },
    },
    subtitle: {
      subtitle: "Let's Begin!",
      styles: {
        fontWeight: "600",
        fontSize: 20,
        textAlign: "center",
      },
    },
    button: { ...button, label: "Start Survey" },
    input,
  },
};
