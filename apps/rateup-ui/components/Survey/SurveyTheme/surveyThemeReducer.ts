import { getSurveyThemeKeyOf } from "./SurveyTheme.constants";

function surveyThemeReducer(state, action) {
  const { payload } = action;
  const { selectedPageTab, surveyTheme } = state;
  const surveyThemeKey = getSurveyThemeKeyOf(selectedPageTab);

  switch (action.type) {
    case "set-survey-theme": {
      if (!payload.surveyTheme.logo) {
        payload.surveyTheme.logo = {
          logo: "",
          styles: {
            width: 50,
            height: 50,
          },
        };
      }
      state.surveyTheme = payload;
      break;
    }
    case "selected-page-tab-change": {
      state.selectedPageTab = payload;
      break;
    }
    case "title-text-change": {
      surveyTheme[surveyThemeKey].title.title = payload;
      break;
    }
    case "subtitle-text-change": {
      surveyTheme[surveyThemeKey].subtitle.subtitle = payload;
      break;
    }
    case "welcome-page-start-button-text-change": {
      surveyTheme[surveyThemeKey].button.label = payload;
      break;
    }

    case "bg-background-color-change": {
      surveyTheme[surveyThemeKey].bg.styles.backgroundColor = payload;
      break;
    }
    case "bg-desktopbg-change": {
      const { desktopbg, desktopbgFile } = payload;
      surveyTheme[surveyThemeKey].bg.desktopbg = desktopbg;
      surveyTheme[surveyThemeKey].bg.desktopbgFile = desktopbgFile;
      break;
    }
    case "bg-mobilebg-change": {
      const { mobilebg, mobilebgFile } = payload;
      surveyTheme[surveyThemeKey].bg.mobilebg = mobilebg;
      surveyTheme[surveyThemeKey].bg.mobilebgFile = mobilebgFile;
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
