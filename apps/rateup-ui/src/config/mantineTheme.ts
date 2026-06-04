import type { MantineColorsTuple, MantineThemeOverride } from "@mantine/core";
import { createTheme } from "@mantine/core";

const rateupBlue: MantineColorsTuple = [
  "#ebf5ff",
  "#d4e8fa",
  "#a4cef7",
  "#73b4f6",
  "#4e9ef5",
  "#3b90f5",
  "#3289f6",
  "#2776dc",
  "#1c69c5",
  "#004f98",
];
const componentStyles: MantineThemeOverride = {
  components: {},
};
export const theme = createTheme({
  fontFamily: '"Inter Variable", "Noto Color Emoji", sans-serif',
  headings: { fontFamily: '"Inter Variable", "Noto Color Emoji", sans-serif' },
  primaryColor: "rateup-blue",
  primaryShade: 9,
  colors: { "rateup-blue": rateupBlue },
  breakpoints: {
    xs: "30em",
    sm: "48em",
    md: "64em",
    lg: "74em",
    xl: "90em",
    "2xl": "120em",
  },
  ...componentStyles,
});
