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
  styles?;
}
interface Title {
  title: string;
  styles?;
  subtitleFontSize: number;
}
interface Subtitle {
  subtitle: string;
  styles?;
}
interface Button {
  label: string;
  styles?;
  position?;
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
