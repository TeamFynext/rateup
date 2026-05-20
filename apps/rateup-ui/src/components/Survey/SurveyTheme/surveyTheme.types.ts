// element types
export interface Bg {
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
export interface Logo {
  logo?: string;
  styles?: any;
}
export interface Title {
  title: string;
  styles?: any;
  subtitleFontSize: number;
}
export interface Subtitle {
  subtitle: string;
  styles?: any;
}
export interface Button {
  label: string;
  styles?: any;
  position?: any;
}

export interface Input {
  primaryColor: string;
}

// theme types
export interface WelcomeTheme {
  bg: Bg;
  logo: Logo;
  title: Title;
  subtitle: Subtitle;
  button: Button;
}
export interface _SurveyTheme {
  bg: Bg;
  title: Title;
  subtitle: Subtitle;
  button: Button;
  input: Input;
  orgLogoEnabled: boolean;
  logo: Logo;
}
export interface ThankyouTheme {
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
