import { PageType, QuestionType } from "@/types/enums.ts";

import BackgroundStyles from "./components/BackgroundStyles.tsx";
import ButtonStyles from "./components/ButtonStyles.tsx";
import HeaderStyles from "./components/HeaderStyles.tsx";
import InputStyles from "./components/InputStyles.tsx";
import LogoStyles from "./components/LogoStyles.tsx";
import { ThemeTabEnum } from "./SurveyTheme.enums";

export const dummyImage =
  "https://www.freeiconspng.com/uploads/no-image-icon-4.png";

export const swatches = [
  "#2e2e2e",
  "#868e96",
  "#fa5252",
  "#e64980",
  "#be4bdb",
  "#7950f2",
  "#4c6ef5",
  "#228be6",
  "#15aabf",
  "#12b886",
  "#40c057",
  "#82c91e",
  "#fab005",
  "#fd7e14",
];

export const swatchesNamesArray = [
  "blue",
  "cyan",
  "gray",
  "green",
  "indigo",
  "lime",
  "orange",
  "pink",
  "red",
  "teal",
  "violet",
  "yellow",
];

export const FontWeights = [
  {
    label: "Black",
    value: "900",
  },
  {
    label: "Extra Bold",
    value: "800",
  },
  {
    label: "Bold",
    value: "700",
  },
  {
    label: "Semi Bold",
    value: "600",
  },
  {
    label: "Medium",
    value: "500",
  },
  {
    label: "Regular",
    value: "400",
  },
  {
    label: "Light",
    value: "300",
  },
  {
    label: "Extra Light",
    value: "200",
  },
  {
    label: "Thin",
    value: "100",
  },
];

export const questionTypeEnumArray = [
  QuestionType.Rating,
  QuestionType.Smiley,
  QuestionType.LD,
  QuestionType.YN,
  QuestionType.Opinion,
  QuestionType.Email,
  QuestionType.Contact,
  QuestionType.MCQ,
  QuestionType.MSQ,
  QuestionType.DDSS,
  QuestionType.DDMS,
  QuestionType.Phone,
  QuestionType.Photo,
  QuestionType.Testimonial,
  QuestionType.EmailPhone,
  QuestionType.Text,
  QuestionType.TextArea,
  QuestionType.Number,
  QuestionType.Date,
  QuestionType.CustomNPS,
  QuestionType.PCQ,
  QuestionType.TnC,
  QuestionType.InfoMessage,
];

const commonSupportedPageEditors = [
  {
    id: "bg-styles-comp",
    Component: BackgroundStyles,
    value: "background-styles",
    label: "Background",
  },
];

const surveyPageEditors = [
  ...commonSupportedPageEditors,
  {
    id: "title-styles-comp",
    Component: HeaderStyles,
    value: "title-styles",
    label: "Title",
  },
  {
    id: "button-styles-comp",
    Component: ButtonStyles,
    value: "button-styles",
    label: "Button",
  },
  {
    id: "input-styles-comp",
    Component: InputStyles,
    value: "input-styles",
    label: "Input",
  },
  {
    id: "logo-styles-comp",
    Component: LogoStyles,
    value: "logo-styles",
    label: "Logo",
  },
];

const welcomePageEditors = [
  ...commonSupportedPageEditors,
  {
    id: "button-styles-comp",
    Component: ButtonStyles,
    value: "button-styles",
    label: "Button",
  },
];

const thankyouPageEditors = [...commonSupportedPageEditors];

const languagePageEditors = [
  ...commonSupportedPageEditors,
  {
    id: "button-styles-comp",
    Component: ButtonStyles,
    value: "button-styles",
    label: "Button",
  },
  {
    id: "input-styles-comp",
    Component: InputStyles,
    value: "input-styles",
    label: "Input",
  },
];

export const supportedPageEditors = {
  surveyPage: surveyPageEditors,
  welcomePage: welcomePageEditors,
  thankyouPage: thankyouPageEditors,
  languagePage: languagePageEditors,
};

export const getSurveyThemeKeyOf = (selectedPageTab) => {
  switch (selectedPageTab) {
    case "surveyPage":
      return "surveyTheme";
    case "welcomePage":
      return "welcomeTheme";
    case "thankyouPage":
      return "thankyouTheme";
    case "languagePage":
      return "languageTheme";
  }
};

export const getSurveyThemeTabValueFromPageType = (pageType) => {
  switch (pageType) {
    case PageType.Welcome: {
      return ThemeTabEnum.WELCOME;
    }
    case PageType.Language: {
      return ThemeTabEnum.LANGUAGE;
    }
    case PageType.ThankYou: {
      return ThemeTabEnum.THANKYOU;
    }
  }
};

export const getSurveyThemeKeyFromPageType = (pageType) => {
  switch (pageType) {
    case PageType.Welcome: {
      return "welcomeTheme";
    }
    case PageType.Language: {
      return "languageTheme";
    }
    case PageType.ThankYou: {
      return "thankyouTheme";
    }
  }
};
