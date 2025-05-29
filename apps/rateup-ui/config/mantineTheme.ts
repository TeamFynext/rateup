import { createTheme, MantineColorsTuple } from "@mantine/core";

import { geist, notoColorEmogi } from "../utils/fonts";

const rateupBlue: MantineColorsTuple = [
  "#eef4fc",
  "#dbe6f2",
  "#b3cae7",
  "#87addc",
  "#6495d4",
  "#4f86cf",
  "#437ece",
  "#356cb6",
  "#2c60a3",
  "#1c518e",
];

const whatsappGreen: MantineColorsTuple = [
  "#edfdfb",
  "#dcf8f5",
  "#b3f1ea",
  "#88ebdf",
  "#69e6d6",
  "#57e2d0",
  "#4ce1cd",
  "#3ec7b5",
  "#30b1a1",
  "#128c7e",
];

export const theme = createTheme({
  fontFamily: `${geist.style.fontFamily}, ${notoColorEmogi.style.fontFamily}`,
  primaryColor: "rateup-blue",
  primaryShade: 9,
  colors: { "rateup-blue": rateupBlue },
});

export const whatsappTheme = createTheme({
  primaryColor: "whatsapp-green",
  fontFamily: `${geist.style.fontFamily}, ${notoColorEmogi.style.fontFamily}`,
  primaryShade: 9,
  colors: { "whatsapp-green": whatsappGreen },
});
