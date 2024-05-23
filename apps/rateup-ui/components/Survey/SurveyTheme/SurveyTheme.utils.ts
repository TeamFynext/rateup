import { produce } from "immer";
import { uploadFile } from "../../../utils/file-upload/upload";
import { SelectedItemEnum } from "./SurveyTheme.enums";
import { SurveyTheme } from "./surveyTheme.types";
import { QuestionType } from "../../../types/enums";

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
        desktopbg: welcomeDesktopBg,
        mobilebg: welcomeMobileBg,
        desktopbgFile: welcomeDesktopBgFile,
        mobilebgFile: welcomeMobileBgFile,
      },
    },
    surveyTheme: {
      bg: {
        desktopbg: surveyDesktopBg,
        mobilebg: surveyMobileBg,
        desktopbgFile: surveyDesktopBgFile,
        mobilebgFile: surveyMobileBgFile,
      },
      logo: { logoFile },
    },
    thankyouTheme: {
      bg: {
        desktopbg: thankyouDesktopBg,
        mobilebg: thankyouMobileBg,
        desktopbgFile: thankyouDesktopBgFile,
        mobilebgFile: thankyouMobileBgFile,
      },
    },
  } = surveyTheme;

  const images = [
    welcomeDesktopBgFile ?? welcomeDesktopBg,
    welcomeMobileBgFile ?? welcomeMobileBg,
    surveyDesktopBgFile ?? surveyDesktopBg,
    surveyMobileBgFile ?? surveyMobileBg,
    thankyouDesktopBgFile ?? thankyouDesktopBg,
    thankyouMobileBgFile ?? thankyouMobileBg,
    logoFile ?? "",
  ];

  console.log(images, "from surveyTheme");

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
    delete draft.welcomeTheme.bg.desktopbgFile;
    delete draft.welcomeTheme.bg.mobilebgFile;
    delete draft.surveyTheme.bg.desktopbgFile;
    delete draft.surveyTheme.bg.mobilebgFile;
    delete draft.thankyouTheme.bg.desktopbgFile;
    delete draft.thankyouTheme.bg.mobilebgFile;
    delete draft.surveyTheme.logo.logoFile;
    [
      draft.welcomeTheme.bg.desktopbg,
      draft.welcomeTheme.bg.mobilebg,
      draft.surveyTheme.bg.desktopbg,
      draft.surveyTheme.bg.mobilebg,
      draft.thankyouTheme.bg.desktopbg,
      draft.thankyouTheme.bg.mobilebg,
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
