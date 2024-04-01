// themeObj is draft obj of immer, since this function is being passes to useImmerReducer.
function themeReducer(themeObj, action) {
  const payload = action.payload;

  switch (action.type) {
    case "background-color-change": {
      themeObj["background"]["styles"]["backgroundColor"] = payload;
      break;
    }
    case "background-destktop-img-change": {
      URL.revokeObjectURL(themeObj["background"]["desktopBgImgUrl"]);
      if (!payload) {
        themeObj["background"]["desktopBgImgUrl"] = null;
        themeObj["background"]["desktopBgImgFile"] = null;
      } else {
        const { url, file } = payload;
        themeObj["background"]["desktopBgImgUrl"] = url;
        themeObj["background"]["desktopBgImgFile"] = file;
      }
      break;
    }
    case "background-mobile-img-change": {
      URL.revokeObjectURL(themeObj["background"]["mobileBgImgUrl"]);
      if (!payload) {
        themeObj["background"]["mobileBgImgUrl"] = null;
        themeObj["background"]["mobileBgImgFile"] = null;
      } else {
        const { url, file } = payload;
        themeObj["background"]["mobileBgImgUrl"] = url;
        themeObj["background"]["mobileBgImgFile"] = file;
      }
      break;
    }

    case "logo-width-change": {
      themeObj["logo"]["styles"]["width"] = payload;
      break;
    }
    case "logo-height-change": {
      themeObj["logo"]["styles"]["height"] = payload;
      break;
    }
    case "logo-file-change": {
      URL.revokeObjectURL(themeObj["logo"]["logoUrl"]);
      if (!payload) {
        themeObj["logo"]["logoUrl"] = null;
        themeObj["logo"]["logoFile"] = null;
      } else {
        const { url, file } = payload;
        themeObj["logo"]["logoUrl"] = url;
        themeObj["logo"]["logoFile"] = file;
      }

      break;
    }

    case "title-color-change": {
      themeObj["title"]["styles"]["color"] = payload;
      break;
    }
    case "title-font-size-change": {
      themeObj["title"]["styles"]["fontSize"] = payload;
      break;
    }
    case "title-font-weight-change": {
      themeObj["title"]["styles"]["fontWeight"] = payload;
      break;
    }
    case "title-text-change": {
      themeObj["title"]["text"] = payload;
      break;
    }

    case "subtitle-color-change": {
      themeObj["subtitle"]["styles"]["color"] = payload;
      break;
    }
    case "subtitle-font-size-change": {
      themeObj["subtitle"]["styles"]["fontSize"] = payload;
      break;
    }
    case "subtitle-font-weight-change": {
      themeObj["subtitle"]["styles"]["fontWeight"] = payload;
      break;
    }
    case "subtitle-text-change": {
      themeObj["subtitle"]["text"] = payload;
      break;
    }

    case "linkListItem-color-change": {
      themeObj["linkListItem"]["styles"]["color"] = payload;
      break;
    }
    case "linkListItem-background-color-change": {
      themeObj["linkListItem"]["styles"]["backgroundColor"] = payload;
      break;
    }
    case "linkListItem-border-radius-change": {
      themeObj["linkListItem"]["styles"]["borderRadius"] = payload;
      break;
    }

    case "update-theme": {
      return payload;
    }

    default: {
      throw Error("Unknown action: " + action.type);
    }
  }
}

export default themeReducer;
