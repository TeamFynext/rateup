import { createTheme } from "@mantine/core";
import { lexend300, notoColorEmogi } from "../utils/fonts";
// Add global theme overrides here. (used by app & storybook)
export const theme = createTheme({
  fontFamily:
    lexend300.style.fontFamily + "," + notoColorEmogi.style.fontFamily,
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
  fontFamily:
    lexend300.style.fontFamily + "," + notoColorEmogi.style.fontFamily,
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
  fontFamily:
    lexend300.style.fontFamily + "," + notoColorEmogi.style.fontFamily,
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
