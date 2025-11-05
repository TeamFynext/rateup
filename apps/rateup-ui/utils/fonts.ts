import { Inter, Noto_Color_Emoji } from "next/font/google";

export const inter = Inter({
  variable: "--font-inter",
  preload: false,
});

export const notoColorEmogi = Noto_Color_Emoji({
  weight: ["400"],
  style: ["normal"],
  variable: "--font-noto-color-emoji",
  subsets: ["emoji"],
  preload: false,
});
