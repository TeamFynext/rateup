import { QuestionType } from "../../../types/enums";
import { SelectedItemEnum } from "./SurveyTheme.enums";

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
  SelectedItemEnum.BACKGROUND,
  SelectedItemEnum.TITLE,
];

const surveyPageEditors = [
  ...commonSupportedPageEditors,
  SelectedItemEnum.BUTTON,
  SelectedItemEnum.INPUT,
  SelectedItemEnum.LOGO,
];

const welcomePageEditors = [
  ...commonSupportedPageEditors,
  SelectedItemEnum.SUBTITLE,
  SelectedItemEnum.BUTTON,
];

const thankyouPageEditors = [
  ...commonSupportedPageEditors,
  SelectedItemEnum.SUBTITLE,
];

const languagePageEditors = [
  ...commonSupportedPageEditors,
  SelectedItemEnum.SUBTITLE,
  SelectedItemEnum.BUTTON,
  SelectedItemEnum.INPUT,
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
