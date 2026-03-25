import { Inter, Noto_Color_Emoji, Sora } from "next/font/google";

export const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const notoColorEmogi = Noto_Color_Emoji({
  weight: ["400"],
  style: ["normal"],
  variable: "--font-noto-color-emoji",
  subsets: ["emoji"],
  preload: false,
});

export const sora = Sora({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});
