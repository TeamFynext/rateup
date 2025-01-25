import { createTheme, MantineThemeComponents } from "@mantine/core";

import { lexend, notoColorEmogi } from "../utils/fonts";

let componentsStyles: MantineThemeComponents = {
  Text: {
    defaultProps: {
      fw: 300,
    },
  },
  Button: {
    defaultProps: {
      fw: 400,
    },
  },
  Title: {
    defaultProps: {
      fw: 500,
    },
  },
};
// Add global theme overrides here. (used by app & storybook)
export const theme = createTheme({
  fontFamily: lexend.style.fontFamily + "," + notoColorEmogi.style.fontFamily,
  primaryColor: "rateup-blue",
  components: componentsStyles,
  colors: {
    "rateup-blue": [
      "#8ea8c7",
      "#7797bb",
      "#6085b0",
      "#5A8FD0",
      "#336299",
      "#1c518e", // Primary
      "#194980",
      "#164172",
      "#2C4E86",
      "#113155",
    ],
  },
});

export const whatsappTheme = createTheme({
  primaryColor: "whatsapp-green",
  fontFamily: lexend.style.fontFamily + "," + notoColorEmogi.style.fontFamily,
  components: componentsStyles,
  colors: {
    "whatsapp-green": [
      "#96d2cb",
      "#7cc6be",
      "#62bbb1",
      "#48b0a4",
      "#2ea597",
      "#149a8a", // Primary color (6 is the default shade in mantine)
      "#11887a",
      "#0f776b",
      "#0d665c",
      "#0b554c",
    ],
  },
});

export const menuTheme = createTheme({
  autoContrast: true,
  fontFamily: lexend.style.fontFamily + "," + notoColorEmogi.style.fontFamily,
  components: componentsStyles,
  primaryColor: "pale-purple",
  colors: {
    "pale-purple": [
      "#f2f0ff",
      "#e0dff2",
      "#bfbdde",
      "#9b98ca",
      "#7d79ba",
      "#6a65b0",
      "#605bac",
      "#504c97",
      "#464388",
      "#3b3979",
    ],
  },
});
