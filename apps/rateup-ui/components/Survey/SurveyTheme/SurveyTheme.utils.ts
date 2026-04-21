import { produce } from "immer";

import { QuestionType } from "../../../types/enums";
import { uploadFile } from "../../../utils/file-upload/upload";
import { SelectedItemEnum } from "./SurveyTheme.enums";
import { SurveyTheme } from "./surveyTheme.types";

export function getImageUrl(
  imageObject: string | Blob,
  unsplashImage: boolean = false,
) {
  if (imageObject instanceof Blob) {
    const url = URL.createObjectURL(imageObject);
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
  const welcomeThemeBgObj = surveyTheme?.welcomeTheme?.bg;
  const welcomeDesktopBgImgUrl = welcomeThemeBgObj?.desktopBg?.imageUrl;
  const welcomeMobileBgImgUrl = welcomeThemeBgObj?.mobileBg?.imageUrl;
  const welcomeDesktopBgImgFile = welcomeThemeBgObj?.desktopBgImgFile;
  const welcomeMobileBgImgFile = welcomeThemeBgObj?.mobileBgImgFile;

  const thankyouThemeBgObj = surveyTheme?.thankyouTheme?.bg;
  const thankyouDesktopBgImgUrl = thankyouThemeBgObj?.desktopBg?.imageUrl;
  const thankyouMobileBgImgUrl = thankyouThemeBgObj?.mobileBg?.imageUrl;
  const thankyouDesktopBgImgFile = thankyouThemeBgObj?.desktopBgImgFile;
  const thankyouMobileBgImgFile = thankyouThemeBgObj?.mobileBgImgFile;

  const languageThemeBgObj = surveyTheme?.languageTheme?.bg;
  const languageDesktopBgImgUrl = languageThemeBgObj?.desktopBg?.imageUrl;
  const languageMobileBgImgUrl = languageThemeBgObj?.mobileBg?.imageUrl;
  const languageDesktopBgImgFile = languageThemeBgObj?.desktopBgImgFile;
  const languageMobileBgImgFile = languageThemeBgObj?.mobileBgImgFile;

  const surveyThemeBgObj = surveyTheme?.surveyTheme?.bg;
  const surveyDesktopBgImgUrl = surveyThemeBgObj?.desktopBg?.imageUrl;
  const surveyMobileBgImgUrl = surveyThemeBgObj?.mobileBg?.imageUrl;
  const surveyDesktopBgImgFile = surveyThemeBgObj?.desktopBgImgFile;
  const surveyMobileBgImgFile = surveyThemeBgObj?.mobileBgImgFile;
  const logoFile = surveyTheme?.surveyTheme?.logo?.logoFile;
  const logo = surveyTheme?.surveyTheme?.logo?.logo;

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
    if (surveyTheme?.welcomeTheme) {
      delete draft.welcomeTheme.bg.desktopBgImgFile;
      delete draft.welcomeTheme.bg.mobileBgImgFile;
    }

    if (surveyTheme?.languageTheme) {
      delete draft.languageTheme.bg.desktopBgImgFile;
      delete draft.languageTheme.bg.mobileBgImgFile;
    }

    if (surveyTheme?.thankyouTheme) {
      delete draft.thankyouTheme.bg.desktopBgImgFile;
      delete draft.thankyouTheme.bg.mobileBgImgFile;
    }

    if (surveyTheme?.surveyTheme) {
      delete draft.surveyTheme.bg.desktopBgImgFile;
      delete draft.surveyTheme.bg.mobileBgImgFile;
      delete draft.surveyTheme.logo.logoFile;
    }

    const [
      welcomeThemeDesktopBgImgUrl,
      welcomeThemeMobileBgImgUrl,
      surveyThemeDesktopBgImgUrl,
      surveyThemeMobileBgImgUrl,
      thankyouThemeDesktopBgImgUrl,
      thankyouThemeMobileBgImgUrl,
      languageThemeDesktopBgImgUrl,
      languageThemeMobileBgImgUrl,
      logoImgUrl,
    ] = urls;

    if (surveyTheme?.welcomeTheme) {
      draft.welcomeTheme.bg.desktopBg.imageUrl = welcomeThemeDesktopBgImgUrl;
      draft.welcomeTheme.bg.mobileBg.imageUrl = welcomeThemeMobileBgImgUrl;
    }

    if (surveyTheme?.thankyouTheme) {
      draft.thankyouTheme.bg.desktopBg.imageUrl = thankyouThemeDesktopBgImgUrl;
      draft.thankyouTheme.bg.mobileBg.imageUrl = thankyouThemeMobileBgImgUrl;
    }

    if (surveyTheme?.languageTheme) {
      draft.languageTheme.bg.desktopBg.imageUrl = languageThemeDesktopBgImgUrl;
      draft.languageTheme.bg.mobileBg.imageUrl = languageThemeMobileBgImgUrl;
    }

    if (surveyTheme?.surveyTheme) {
      draft.surveyTheme.bg.desktopBg.imageUrl = surveyThemeDesktopBgImgUrl;
      draft.surveyTheme.bg.mobileBg.imageUrl = surveyThemeMobileBgImgUrl;
      draft.surveyTheme.logo.logo = logoImgUrl;
    }
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
