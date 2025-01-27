import { Geist, Noto_Color_Emoji, Rubik } from "next/font/google";

export const geist = Geist({
  variable: "--font-geist",
  preload: false,
});

export const rubik = Rubik({
  variable: "--font-rubik",
  subsets: ["latin"],
});

export const notoColorEmogi = Noto_Color_Emoji({
  weight: ["400"],
  style: ["normal"],
  variable: "--font-noto-color-emoji",
  subsets: ["emoji"],
});
