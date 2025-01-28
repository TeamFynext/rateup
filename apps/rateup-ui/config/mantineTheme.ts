import { createTheme, MantineThemeComponents } from "@mantine/core";

import { geist, notoColorEmogi } from "../utils/fonts";

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
  fontFamily: `${geist.style.fontFamily}, ${notoColorEmogi.style.fontFamily}`,
  primaryColor: "rateup-blue",
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
  fontFamily: `${geist.style.fontFamily}, ${notoColorEmogi.style.fontFamily}`,
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
