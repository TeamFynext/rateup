import type { CSSProperties } from "react";

// element types
interface Bg {
  desktopbg?: string;
  mobilebg?: string;
  styles: {
    backgroundColor: string;
  };
  unsplashImage?: {
    desktop: boolean;
    mobile: boolean;
  };
}
interface Logo {
  logo?: string;
  styles?: CSSProperties;
}
interface Title {
  title: string;
  styles?: CSSProperties;
  subtitleFontSize: number;
}
interface Subtitle {
  subtitle: string;
  styles?: CSSProperties;
}
interface Button {
  label: string;
  styles?: CSSProperties;
  /** `position` holds the `COORDINATESX`/`COORDINATESY` names, not pixels. */
  position?: { x?: string; y?: string };
}

interface Input {
  primaryColor: string;
}

// theme types
interface WelcomeTheme {
  bg: Bg;
  logo: Logo;
  title: Title;
  subtitle: Subtitle;
  button: Button;
}
interface _SurveyTheme {
  bg: Bg;
  title: Title;
  subtitle: Subtitle;
  button: Button;
  input: Input;
  orgLogoEnabled: boolean;
  logo: Logo;
}
interface ThankyouTheme {
  bg: Bg;
  logo: Logo;
  title: Title;
  subtitle: Subtitle;
  confettiEnabled: boolean;
}

// overall theme
export interface SurveyTheme {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  surveyId: string;
  welcomeTheme: WelcomeTheme;
  surveyTheme: _SurveyTheme;
  thankyouTheme: ThankyouTheme;
}

/** One background layer (desktop or mobile) of a themed page. */
interface SurveyThemeBgLayer {
  bgColor?: string;
  imageUrl?: string | null;
  chooseBgRadioInputValue?: string;
}

/** The editable theme of a single page (survey, thank-you, …). */
export interface SurveyThemePage {
  bg: {
    desktopBg: SurveyThemeBgLayer;
    mobileBg: SurveyThemeBgLayer;
    desktopBgImgFile?: File | null;
    mobileBgImgFile?: File | null;
    /** Page themes only: reuse the survey theme's background. */
    useSurveyBackground?: boolean;
    /** Written by older versions of the editor; still present on old rows. */
    styles?: CSSProperties;
  };
  title: { title?: string; styles: CSSProperties; subtitleFontSize?: number };
  subtitle: { subtitle?: string; styles: CSSProperties };
  /** `position` holds the `COORDINATESX`/`COORDINATESY` names, not pixels. */
  button: { label?: string; styles: CSSProperties; position?: { x?: string; y?: string } };
  input: { primaryColor?: string };
  logo: { styles: CSSProperties; logo?: string | null; logoFile?: File | null };
  confettiEnabled?: boolean;
  /** Page themes only: mirror the survey theme instead of their own styles. */
  useSurveyTheme?: boolean;
}
