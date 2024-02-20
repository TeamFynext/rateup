const background = {
  desktopbg: "",
  mobilebg: "",
  styles: {
    backgroundColor: "#ffffff",
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
    backgroundColor: "rgb(28, 81, 142)",
    color: "rgb(255, 255, 255)",
    textAlign: "center",
  },
};

export const defaultTheme = {
  id: undefined,
  createdAt: new Date(),
  updatedAt: new Date(),
  surveyId: undefined,
  welcomeTheme: {
    bg: background,
    logo: logo,
    title: { ...title, title: "Welcome" },
    subtitle: { ...subtitle, subtitle: "Welcome to the survey" },
    button: { ...button, label: "Start Survey" },
  },
  surveyTheme: {
    bg: background,
    title: { ...title, styles: { ...title.styles, textAlign: "left" } },
    subtitle: {
      ...subtitle,
      styles: { ...subtitle.styles, textAlign: "left" },
    },
    button: button,
    input: {
      primaryColor: "rateup-blue",
    },
  },
  thankyouTheme: {
    bg: background,
    logo: logo,
    title: { ...title, title: "Thank you" },
    subtitle: { ...subtitle, subtitle: "Thank you for taking the survey" },
    confettiEnabled: false,
  },
};
