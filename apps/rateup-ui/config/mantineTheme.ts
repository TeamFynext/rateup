import {
  createTheme,
  MantineColorsTuple,
  MantineThemeOverride,
} from "@mantine/core";

import { inter, notoColorEmogi } from "../utils/fonts";

const rateupBlue: MantineColorsTuple = [
  "#e6f5ff",
  "#d1e5ff",
  "#a3c8f7",
  "#72aaf1",
  "#4a90eb",
  "#3080e9",
  "#1873e8",
  "#0e66d0",
  "#005abb",
  "#004ea6",
];
const componentStyles: MantineThemeOverride = {
  components: {},
};
export const theme = createTheme({
  fontFamily: `${inter.style.fontFamily}, ${notoColorEmogi.style.fontFamily}`,
  primaryColor: "rateup-blue",
  primaryShade: 6,
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
