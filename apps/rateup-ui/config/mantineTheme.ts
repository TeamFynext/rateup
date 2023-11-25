import { createTheme } from "@mantine/core";
import { lexend300 } from "../utils/fonts";
// Add global theme overrides here. (used by app & storybook)
export const theme = createTheme({
  fontFamily: lexend300.style.fontFamily,
  primaryColor: "rateup-blue",
  colors: {
    "rateup-blue": [
      "#8ea8c7",
      "#7797bb",
      "#6085b0",
      "#4974a5",
      "#336299",
      "#1c518e", // Primary
      "#194980",
      "#164172",
      "#143963",
      "#113155",
    ],
  },
});

export const whatsappTheme = createTheme({
  primaryColor: "whatsapp-green",
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
