import { produce } from "immer";

import { uploadFile } from "@/utils/file-upload/upload.ts";

import type { SurveyTheme } from "./surveyTheme.types";
import type { SurveyThemePage } from "./surveyThemeReducer.ts";

export async function destructureThemeAndUploadImagesIfAny(
  surveyTheme: Record<string, SurveyThemePage>,
) {
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
    images.map((image: string | File | Blob | null | undefined) =>
      image instanceof File || image instanceof Blob
        ? uploadFile(image).then(
            (fileKey) => `${import.meta.env.VITE_AWS_CLOUDFRONT_URL}${fileKey}`,
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
