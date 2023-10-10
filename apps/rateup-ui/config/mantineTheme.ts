import { createTheme } from "@mantine/core";
import { GilroyRegular } from "../public/fonts";
// Add global theme overrides here. (used by app & storybook)
export const theme = createTheme({
  fontFamily: GilroyRegular.style.fontFamily,
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
