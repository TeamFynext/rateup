import { produce } from "immer";
import { uploadFile } from "../../../utils/file-upload/upload";
import { SelectedItemEnum } from "./SurveyTheme.enums";
import { SurveyTheme } from "./surveyTheme.types";
import { QuestionType } from "../../../types/enums";
import _ from "lodash";

export function getImageUrl(
  imageObject: string | Blob,
  unsplashImage: boolean = false,
) {
  if (imageObject instanceof Blob) {
    let url = URL.createObjectURL(imageObject);
    return url;
  }
  if (unsplashImage)
    return encodeURI(`${process.env.NEXT_PUBLIC_UNSPLASH_URL}${imageObject}`);

  if (imageObject) {
    return encodeURI(
      `${process.env.NEXT_PUBLIC_AWS_CLOUDFRONT_URL}${imageObject}`,
    );
  }
  return "";
}

export function compareTwoObjects(obj1: any, obj2: any) {
  return JSON.stringify(obj1) === JSON.stringify(obj2);
}

export function getDividerLabel(tabState: SelectedItemEnum) {
  switch (tabState) {
    case SelectedItemEnum.LOGO:
      return "Logo";
    case SelectedItemEnum.TITLE:
      return "Title";
    case SelectedItemEnum.SUBTITLE:
      return "Subtitle";
    case SelectedItemEnum.BUTTON:
      return "Button";
    case SelectedItemEnum.BACKGROUND:
      return "Background";
    case SelectedItemEnum.INPUT:
      return "Input";
    default:
      return "Background";
  }
}

export async function destructureThemeAndUploadImagesIfAny(surveyTheme) {
  const {
    welcomeTheme: {
      bg: {
        desktopBg: { imageUrl: welcomeDesktopBgImgUrl },
        mobileBg: { imageUrl: welcomeMobileBgImgUrl },
        desktopBgImgFile: welcomeDesktopBgImgFile,
        mobileBgImgFile: welcomeMobileBgImgFile,
      },
    },
    surveyTheme: {
      bg: {
        desktopBg: { imageUrl: surveyDesktopBgImgUrl },
        mobileBg: { imageUrl: surveyMobileBgImgUrl },
        desktopBgImgFile: surveyDesktopBgImgFile,
        mobileBgImgFile: surveyMobileBgImgFile,
      },
      logo: { logoFile, logo },
    },
    thankyouTheme: {
      bg: {
        desktopBg: { imageUrl: thankyouDesktopBgImgUrl },
        mobileBg: { imageUrl: thankyouMobileBgImgUrl },
        desktopBgImgFile: thankyouDesktopBgImgFile,
        mobileBgImgFile: thankyouMobileBgImgFile,
      },
    },
    languageTheme: {
      bg: {
        desktopBg: { imageUrl: languageDesktopBgImgUrl },
        mobileBg: { imageUrl: languageMobileBgImgUrl },
        desktopBgImgFile: languageDesktopBgImgFile,
        mobileBgImgFile: languageMobileBgImgFile,
      },
    },
  } = surveyTheme;

  const images = [
    welcomeDesktopBgImgFile ?? welcomeDesktopBgImgUrl,
    welcomeMobileBgImgFile ?? welcomeMobileBgImgUrl,
    surveyDesktopBgImgFile ?? surveyDesktopBgImgUrl,
    surveyMobileBgImgFile ?? surveyMobileBgImgUrl,
    thankyouDesktopBgImgFile ?? thankyouDesktopBgImgUrl,
    thankyouMobileBgImgFile ?? thankyouMobileBgImgUrl,
    languageDesktopBgImgFile ?? languageDesktopBgImgUrl,
    languageMobileBgImgFile ?? languageMobileBgImgUrl,
    logoFile ?? logo,
  ];

  const urls = await Promise.all(
    images.map((image: string | File | Blob) =>
      image instanceof File || image instanceof Blob
        ? uploadFile(image).then(
            (fileKey) =>
              `${process.env.NEXT_PUBLIC_AWS_CLOUDFRONT_URL}${fileKey}`,
          )
        : Promise.resolve(image),
    ),
  );

  const newSurveyTheme = produce(surveyTheme, (draft) => {
    delete draft.welcomeTheme.bg.desktopBgImgFile;
    delete draft.welcomeTheme.bg.mobileBgImgFile;
    delete draft.surveyTheme.bg.desktopBgImgFile;
    delete draft.surveyTheme.bg.mobileBgImgFile;
    delete draft.thankyouTheme.bg.desktopBgImgFile;
    delete draft.thankyouTheme.bg.mobileBgImgFile;
    delete draft.languageTheme.bg.desktopBgImgFile;
    delete draft.languageTheme.bg.mobileBgImgFile;
    delete draft.surveyTheme.logo.logoFile;
    [
      draft.welcomeTheme.bg.desktopBg.imageUrl,
      draft.welcomeTheme.bg.mobileBg.imageUrl,
      draft.surveyTheme.bg.desktopBg.imageUrl,
      draft.surveyTheme.bg.mobileBg.imageUrl,
      draft.thankyouTheme.bg.desktopBg.imageUrl,
      draft.thankyouTheme.bg.mobileBg.imageUrl,
      draft.languageTheme.bg.desktopBg.imageUrl,
      draft.languageTheme.bg.mobileBg.imageUrl,
      draft.surveyTheme.logo.logo,
    ] = urls;
  });

  return newSurveyTheme as unknown as SurveyTheme;
}

export function getFeaturesBasedOnQuestionType(
  selectedLanguage: string,
  questionType: QuestionType,
) {
  const common = {
    email: {
      headText: "Email",
      isEnabled: true,
    },
    name: {
      headText: "Name",
      isEnabled: true,
    },
    phone: {
      headText: "Phone",
      isEnabled: true,
    },
  };
  switch (questionType) {
    case QuestionType.Testimonial:
      return {
        [selectedLanguage]: {
          jobTitle: true,
          photo: true,
          rating: true,
        },
      };
    case QuestionType.Contact:
      return { [selectedLanguage]: common };
    case QuestionType.Email:
      return {
        [selectedLanguage]: {
          ...common,
          name: { ...common.name, isEnabled: false },
          phone: { ...common.phone, isEnabled: false },
        },
      };
    case QuestionType.Phone:
      return {
        [selectedLanguage]: {
          ...common,
          name: { ...common.name, isEnabled: false },
          email: { ...common.email, isEnabled: false },
        },
      };
    default:
      return {};
  }
}
