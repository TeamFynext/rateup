import type { CSSProperties } from "react";

/** An uploaded image slot, holding both the object URL and the pending file. */
interface LinktreeThemeImage {
  url: string | null;
  file: File | null;
}

/** The linktree theme document this reducer edits (an immer draft). */
export interface LinktreeTheme {
  background: {
    styles: CSSProperties;
    desktopBgImgUrl: string | null;
    desktopBgImgFile?: File | null;
    mobileBgImgUrl: string | null;
    mobileBgImgFile?: File | null;
  };
  logo: {
    styles: CSSProperties;
    logoUrl?: string | null;
    logoFile?: File | null;
  };
  title: { styles: CSSProperties; text: string };
  subtitle: { styles: CSSProperties; text: string };
  linkListItem: { styles: CSSProperties };
}

export type LinktreeThemeAction = {
  type: string;
  payload?: unknown;
};

/**
 * Style actions carry a plain CSS value (a colour, size or weight). The action
 * type is a bare string, so the payload cannot be discriminated on it; this is
 * the single place that value is narrowed.
 */
const cssValue = (payload: unknown) => payload as string & number;

// themeObj is draft obj of immer, since this function is being passes to useImmerReducer.
function themeReducer(themeObj: LinktreeTheme, action: LinktreeThemeAction): LinktreeTheme | void {
  const payload = action.payload;

  switch (action.type) {
    case "background-color-change": {
      themeObj["background"]["styles"]["backgroundColor"] = cssValue(payload);
      break;
    }
    case "background-destktop-img-change": {
      URL.revokeObjectURL(themeObj["background"]["desktopBgImgUrl"] ?? "");
      if (!payload) {
        themeObj["background"]["desktopBgImgUrl"] = null;
        themeObj["background"]["desktopBgImgFile"] = null;
      } else {
        const { url, file } = payload as LinktreeThemeImage;
        themeObj["background"]["desktopBgImgUrl"] = url;
        themeObj["background"]["desktopBgImgFile"] = file;
      }
      break;
    }
    case "background-mobile-img-change": {
      URL.revokeObjectURL(themeObj["background"]["mobileBgImgUrl"] ?? "");
      if (!payload) {
        themeObj["background"]["mobileBgImgUrl"] = null;
        themeObj["background"]["mobileBgImgFile"] = null;
      } else {
        const { url, file } = payload as LinktreeThemeImage;
        themeObj["background"]["mobileBgImgUrl"] = url;
        themeObj["background"]["mobileBgImgFile"] = file;
      }
      break;
    }

    case "logo-width-change": {
      themeObj["logo"]["styles"]["width"] = cssValue(payload);
      break;
    }
    case "logo-height-change": {
      themeObj["logo"]["styles"]["height"] = cssValue(payload);
      break;
    }
    case "logo-file-change": {
      URL.revokeObjectURL(themeObj["logo"]["logoUrl"] ?? "");
      if (!payload) {
        themeObj["logo"]["logoUrl"] = null;
        themeObj["logo"]["logoFile"] = null;
      } else {
        const { url, file } = payload as LinktreeThemeImage;
        themeObj["logo"]["logoUrl"] = url;
        themeObj["logo"]["logoFile"] = file;
      }

      break;
    }

    case "title-color-change": {
      themeObj["title"]["styles"]["color"] = cssValue(payload);
      break;
    }
    case "title-font-size-change": {
      themeObj["title"]["styles"]["fontSize"] = cssValue(payload);
      break;
    }
    case "title-font-weight-change": {
      themeObj["title"]["styles"]["fontWeight"] = cssValue(payload);
      break;
    }
    case "title-text-change": {
      themeObj["title"]["text"] = cssValue(payload);
      break;
    }

    case "subtitle-color-change": {
      themeObj["subtitle"]["styles"]["color"] = cssValue(payload);
      break;
    }
    case "subtitle-font-size-change": {
      themeObj["subtitle"]["styles"]["fontSize"] = cssValue(payload);
      break;
    }
    case "subtitle-font-weight-change": {
      themeObj["subtitle"]["styles"]["fontWeight"] = cssValue(payload);
      break;
    }
    case "subtitle-text-change": {
      themeObj["subtitle"]["text"] = cssValue(payload);
      break;
    }

    case "linkListItem-color-change": {
      themeObj["linkListItem"]["styles"]["color"] = cssValue(payload);
      break;
    }
    case "linkListItem-background-color-change": {
      themeObj["linkListItem"]["styles"]["backgroundColor"] = cssValue(payload);
      break;
    }
    case "linkListItem-border-radius-change": {
      themeObj["linkListItem"]["styles"]["borderRadius"] = cssValue(payload);
      break;
    }

    case "update-theme": {
      return payload as LinktreeTheme;
    }

    default: {
      throw Error("Unknown action: " + action.type);
    }
  }
}

export default themeReducer;
