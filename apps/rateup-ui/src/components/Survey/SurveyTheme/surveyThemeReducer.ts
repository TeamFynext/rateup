import { getSurveyThemeKeyOf } from "./SurveyTheme.constants";

function surveyThemeReducer(state: SurveyThemeState, action: SurveyThemeAction) {
  const { payload } = action;
  const { selectedPageTab, surveyTheme, selectedPreview } = state;
  const surveyThemeKey = getSurveyThemeKeyOf(selectedPageTab);

  switch (action.type) {
    case "set-survey-theme": {
      state.surveyTheme = payload;
      break;
    }

    case "open-editors-change": {
      state.openEditors = payload;
      break;
    }

    case "selected-preview-change": {
      state.selectedPreview = payload;
      break;
    }

    case "selected-page-tab-change": {
      state.selectedPageTab = payload;
      break;
    }

    case "bg-background-color-change": {
      if (selectedPreview === "desktop") {
        surveyTheme[surveyThemeKey].bg.desktopBg.bgColor = payload;
      }
      if (selectedPreview === "mobile") {
        surveyTheme[surveyThemeKey].bg.mobileBg.bgColor = payload;
      }
      break;
    }
    case "bg-desktopBgImg-change": {
      const { desktopBgImg, desktopBgImgFile } = payload;
      surveyTheme[surveyThemeKey].bg.desktopBg.imageUrl = desktopBgImg;
      surveyTheme[surveyThemeKey].bg.desktopBgImgFile = desktopBgImgFile;
      break;
    }
    case "bg-mobileBgImg-change": {
      const { mobileBgImg, mobileBgImgFile } = payload;
      surveyTheme[surveyThemeKey].bg.mobileBg.imageUrl = mobileBgImg;
      surveyTheme[surveyThemeKey].bg.mobileBgImgFile = mobileBgImgFile;
      break;
    }
    case "bg-choose-background-radio-change": {
      if (selectedPreview === "desktop") {
        surveyTheme[surveyThemeKey].bg.desktopBg.chooseBgRadioInputValue = payload;
      }
      if (selectedPreview === "mobile") {
        surveyTheme[surveyThemeKey].bg.mobileBg.chooseBgRadioInputValue = payload;
      }
      break;
    }
    case "bg-confetti-change": {
      surveyTheme[surveyThemeKey].confettiEnabled = payload;
      break;
    }

    case "title-color-change": {
      surveyTheme[surveyThemeKey].title.styles.color = payload;
      break;
    }
    case "title-font-weight-change": {
      surveyTheme[surveyThemeKey].title.styles.fontWeight = payload;
      break;
    }
    case "title-font-size-change": {
      surveyTheme[surveyThemeKey].title.styles.fontSize = payload;
      break;
    }

    case "subtitle-color-change": {
      surveyTheme[surveyThemeKey].subtitle.styles.color = payload;
      break;
    }
    case "subtitle-font-weight-change": {
      surveyTheme[surveyThemeKey].subtitle.styles.fontWeight = payload;
      break;
    }
    case "subtitle-font-size-change": {
      surveyTheme[surveyThemeKey].subtitle.styles.fontSize = payload;
      break;
    }

    case "button-background-color-change": {
      surveyTheme[surveyThemeKey].button.styles.backgroundColor = payload;
      break;
    }
    case "button-text-color-change": {
      surveyTheme[surveyThemeKey].button.styles.color = payload;
      break;
    }
    case "button-border-radius-change": {
      surveyTheme[surveyThemeKey].button.styles.borderRadius = payload;
      break;
    }
    case "button-x-coordinate-change": {
      surveyTheme[surveyThemeKey].button.position.x = payload;
      break;
    }
    case "button-y-coordinate-change": {
      surveyTheme[surveyThemeKey].button.position.y = payload;
      break;
    }

    case "input-color-change": {
      surveyTheme[surveyThemeKey].input.primaryColor = payload;
      break;
    }

    case "logo-height-change": {
      surveyTheme[surveyThemeKey].logo.styles.height = payload;
      break;
    }
    case "logo-width-change": {
      surveyTheme[surveyThemeKey].logo.styles.width = payload;
      break;
    }
    case "logo-file-change": {
      const { file, url } = payload;
      surveyTheme[surveyThemeKey].logo.logo = url;
      surveyTheme[surveyThemeKey].logo.logoFile = file;
      break;
    }
  }
}

export default surveyThemeReducer;
