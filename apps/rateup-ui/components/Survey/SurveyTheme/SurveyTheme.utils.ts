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

export const addSurveyThemeLogoObjIfNotPresent = (payloadCopy) => {
  payloadCopy.surveyTheme.logo = {
    logo: "",
    styles: {
      width: 50,
      height: 50,
    },
  };
};

export const getImgUrl = (str) => {
  let urlStr = str;
  if (!str) urlStr = "";

  let resultStr = "";

  if (urlStr.startsWith("https://") || urlStr.startsWith("http://")) {
    resultStr = urlStr;
  } else if (urlStr.length > 0 && !urlStr.startsWith("#")) {
    resultStr = `${process.env.NEXT_PUBLIC_AWS_CLOUDFRONT_URL}${urlStr}`;
  }
  return resultStr;
};

const getChooseBgRadioValue = (urlStr) => {
  const str = getImgUrl(urlStr);
  if (str.startsWith("https://") || str.startsWith("http://")) {
    return "image";
  } else {
    return "color";
  }
};

export const convertBgObjToReqStructure = (payloadCopy) => {
  for (const key in payloadCopy) {
    const bgObj = payloadCopy[key].bg;
    const desktopbg = bgObj.desktopbg;
    const mobilebg = bgObj.mobilebg;

    const desktopChooseBgRadioInputValue = getChooseBgRadioValue(desktopbg);
    const mobileChooseBgRadioInputValue = getChooseBgRadioValue(mobilebg);

    const resultBgObj = {
      desktopBg: {
        chooseBgRadioInputValue: desktopChooseBgRadioInputValue,
        imageUrl: getImgUrl(desktopbg),
        bgColor: desktopbg?.startsWith("#") ? desktopbg : "#f7f7f7",
      },
      mobileBg: {
        chooseBgRadioInputValue: mobileChooseBgRadioInputValue,
        imageUrl: getImgUrl(mobilebg),
        bgColor: mobilebg?.startsWith("#") ? mobilebg : "#f7f7f7",
      },
    };

    payloadCopy[key].bg = resultBgObj;
  }
};

export const verifyAndConvertSurveyThemeObj = (surveyTheme) => {
  const surveyThemeCopy = _.cloneDeep(surveyTheme);
  if (
    surveyTheme["surveyTheme"].bg.hasOwnProperty("desktopbg") &&
    surveyTheme["surveyTheme"].bg.hasOwnProperty("mobilebg")
  ) {
    const desktopBg = surveyTheme["surveyTheme"].bg.desktopbg;
    const mobileBg = surveyTheme["surveyTheme"].bg.mobilebg;
    const isBgObjInReqStructure =
      typeof desktopBg === "object" && typeof mobileBg === "object";
    const surveyThemeLogoKeyPresent = surveyTheme["surveyTheme"].logo;

    if (!isBgObjInReqStructure || !surveyThemeLogoKeyPresent) {
      if (!isBgObjInReqStructure) convertBgObjToReqStructure(surveyThemeCopy);
      if (!surveyThemeLogoKeyPresent)
        addSurveyThemeLogoObjIfNotPresent(surveyThemeCopy);
    }
  }

  if (typeof surveyTheme["welcomeTheme"].bg.useSurveyBackground !== "boolean") {
    // use survey background checkbox will be present in webpage theme and thankyou page theme background editor, for that useSurveyBackground is being used.
    surveyThemeCopy["welcomeTheme"].bg.useSurveyBackground = false;
    surveyThemeCopy["thankyouTheme"].bg.useSurveyBackground = false;
  }

  if (!surveyTheme["languageTheme"]) {
    surveyThemeCopy["languageTheme"] = {
      bg: surveyThemeCopy["surveyTheme"].bg,
      title: {
        title: "Select a Language",
        styles: {
          fontWeight: "300",
          fontSize: 34,
          textAlign: "center",
        },
      },
      subtitle: {
        subtitle: "Let's Begin!",
        styles: {
          fontWeight: "600",
          fontSize: 20,
          textAlign: "center",
        },
      },
      input: {
        primaryColor: "#",
      },
      button: {
        label: "Start Survey",
        styles: {
          backgroundColor: "#1C518E",
          color: "#FFFFFF",
          textAlign: "center",
        },
      },
    };
    surveyThemeCopy["languageTheme"].bg.useSurveyBackground = true;
  }

  return surveyThemeCopy;
};

export const addWelcomeBtnPositionObjIfNotPresent = (
  surveyTheme,
  surveyThemeKey,
) => {
  if (!surveyTheme[surveyThemeKey].button.position) {
    surveyTheme[surveyThemeKey].button.position = { x: "CENTER", y: "DEFAULT" };
  }
};
