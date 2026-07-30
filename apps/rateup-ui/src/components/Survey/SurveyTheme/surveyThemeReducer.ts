import type { CSSProperties } from "react";

import { getSurveyThemeKeyOf } from "./SurveyTheme.constants";

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
  };
  title: { styles: CSSProperties };
  subtitle: { styles: CSSProperties };
  button: { styles: CSSProperties; position: { x?: number; y?: number } };
  input: { primaryColor?: string };
  logo: { styles: CSSProperties; logo?: string | null; logoFile?: File | null };
  confettiEnabled?: boolean;
}

/** The reducer's working state: the theme document plus editor UI state. */
export interface SurveyThemeState {
  selectedPageTab: string;
  selectedPreview: string;
  openEditors: string[];
  surveyTheme: Record<string, SurveyThemePage>;
}

/** An action dispatched into the survey-theme reducer. */
export type SurveyThemeAction = {
  type: string;
  payload?: unknown;
};

/**
 * Style actions carry a plain CSS value. The action type is a bare string, so
 * the payload cannot be discriminated on it; this narrows it in one place.
 */
const themeValue = (payload: unknown) => payload as string & number & boolean;

function surveyThemeReducer(state: SurveyThemeState, action: SurveyThemeAction) {
  const { payload } = action;
  const { selectedPageTab, surveyTheme, selectedPreview } = state;
  // The tab is always one of the four the helper maps.
  const surveyThemeKey = getSurveyThemeKeyOf(selectedPageTab)!;

  switch (action.type) {
    case "set-survey-theme": {
      state.surveyTheme = payload as Record<string, SurveyThemePage>;
      break;
    }

    case "open-editors-change": {
      state.openEditors = payload as string[];
      break;
    }

    case "selected-preview-change": {
      state.selectedPreview = themeValue(payload);
      break;
    }

    case "selected-page-tab-change": {
      state.selectedPageTab = themeValue(payload);
      break;
    }

    case "bg-background-color-change": {
      if (selectedPreview === "desktop") {
        surveyTheme[surveyThemeKey].bg.desktopBg.bgColor = themeValue(payload);
      }
      if (selectedPreview === "mobile") {
        surveyTheme[surveyThemeKey].bg.mobileBg.bgColor = themeValue(payload);
      }
      break;
    }
    case "bg-desktopBgImg-change": {
      const { desktopBgImg, desktopBgImgFile } = payload as {
        desktopBgImg: string | null;
        desktopBgImgFile: File | null;
      };
      surveyTheme[surveyThemeKey].bg.desktopBg.imageUrl = desktopBgImg;
      surveyTheme[surveyThemeKey].bg.desktopBgImgFile = desktopBgImgFile;
      break;
    }
    case "bg-mobileBgImg-change": {
      const { mobileBgImg, mobileBgImgFile } = payload as {
        mobileBgImg: string | null;
        mobileBgImgFile: File | null;
      };
      surveyTheme[surveyThemeKey].bg.mobileBg.imageUrl = mobileBgImg;
      surveyTheme[surveyThemeKey].bg.mobileBgImgFile = mobileBgImgFile;
      break;
    }
    case "bg-choose-background-radio-change": {
      if (selectedPreview === "desktop") {
        surveyTheme[surveyThemeKey].bg.desktopBg.chooseBgRadioInputValue = themeValue(payload);
      }
      if (selectedPreview === "mobile") {
        surveyTheme[surveyThemeKey].bg.mobileBg.chooseBgRadioInputValue = themeValue(payload);
      }
      break;
    }
    case "bg-confetti-change": {
      surveyTheme[surveyThemeKey].confettiEnabled = themeValue(payload);
      break;
    }

    case "title-color-change": {
      surveyTheme[surveyThemeKey].title.styles.color = themeValue(payload);
      break;
    }
    case "title-font-weight-change": {
      surveyTheme[surveyThemeKey].title.styles.fontWeight = themeValue(payload);
      break;
    }
    case "title-font-size-change": {
      surveyTheme[surveyThemeKey].title.styles.fontSize = themeValue(payload);
      break;
    }

    case "subtitle-color-change": {
      surveyTheme[surveyThemeKey].subtitle.styles.color = themeValue(payload);
      break;
    }
    case "subtitle-font-weight-change": {
      surveyTheme[surveyThemeKey].subtitle.styles.fontWeight = themeValue(payload);
      break;
    }
    case "subtitle-font-size-change": {
      surveyTheme[surveyThemeKey].subtitle.styles.fontSize = themeValue(payload);
      break;
    }

    case "button-background-color-change": {
      surveyTheme[surveyThemeKey].button.styles.backgroundColor = themeValue(payload);
      break;
    }
    case "button-text-color-change": {
      surveyTheme[surveyThemeKey].button.styles.color = themeValue(payload);
      break;
    }
    case "button-border-radius-change": {
      surveyTheme[surveyThemeKey].button.styles.borderRadius = themeValue(payload);
      break;
    }
    case "button-x-coordinate-change": {
      surveyTheme[surveyThemeKey].button.position.x = themeValue(payload);
      break;
    }
    case "button-y-coordinate-change": {
      surveyTheme[surveyThemeKey].button.position.y = themeValue(payload);
      break;
    }

    case "input-color-change": {
      surveyTheme[surveyThemeKey].input.primaryColor = themeValue(payload);
      break;
    }

    case "logo-height-change": {
      surveyTheme[surveyThemeKey].logo.styles.height = themeValue(payload);
      break;
    }
    case "logo-width-change": {
      surveyTheme[surveyThemeKey].logo.styles.width = themeValue(payload);
      break;
    }
    case "logo-file-change": {
      const { file, url } = payload as { file: File | null; url: string | null };
      surveyTheme[surveyThemeKey].logo.logo = url;
      surveyTheme[surveyThemeKey].logo.logoFile = file;
      break;
    }
  }
}

export default surveyThemeReducer;
