import type { TFunction } from "i18next";

import type { LinktreeTheme } from "@/backend/linktree/linktree.api.ts";
import { luminance } from "@/utils/color.ts";

export const DEFAULT_LINK_PAGE_THEME: LinktreeTheme = {
  background: {
    styles: { backgroundColor: "#f7f7f7" },
    desktopBgImgUrl: null,
    mobileBgImgUrl: null,
  },
  title: { styles: { color: "#000000", fontWeight: 500, fontSize: 30 }, text: "Welcome" },
  subtitle: {
    styles: { color: "#000000", fontWeight: 300, fontSize: 16 },
    text: "Please fill the survey",
  },
  logo: { styles: { height: 50, width: 50 }, logoUrl: null },
  linkListItem: { styles: { backgroundColor: "#0A000D", color: "#FFFFFF", borderRadius: 16 } },
};

/** A starting look: page, text and button colours chosen to read well together. */
export interface ThemePreset {
  id: string;
  label: string;
  page: string;
  text: string;
  button: string;
  buttonText: string;
}

export function themePresets(t: TFunction): ThemePreset[] {
  return [
    {
      id: "light",
      label: t("Light"),
      page: "#f7f7f7",
      text: "#111827",
      button: "#0a000d",
      buttonText: "#ffffff",
    },
    {
      id: "dark",
      label: t("Dark"),
      page: "#111827",
      text: "#f9fafb",
      button: "#ffffff",
      buttonText: "#111827",
    },
    {
      id: "navy",
      label: t("Navy"),
      page: "#0f2540",
      text: "#ffffff",
      button: "#f8951d",
      buttonText: "#0f2540",
    },
    {
      id: "warm",
      label: t("Warm"),
      page: "#fff7ed",
      text: "#7c2d12",
      button: "#c2410c",
      buttonText: "#ffffff",
    },
    {
      id: "mint",
      label: t("Mint"),
      page: "#ecfdf5",
      text: "#064e3b",
      button: "#177f45",
      buttonText: "#ffffff",
    },
    {
      id: "blush",
      label: t("Blush"),
      page: "#fdf2f8",
      text: "#831843",
      button: "#be185d",
      buttonText: "#ffffff",
    },
  ];
}

export function matchesPreset(theme: LinktreeTheme, preset: ThemePreset) {
  const same = (a: unknown, b: string) => String(a ?? "").toLowerCase() === b;
  return (
    same(theme.background.styles.backgroundColor, preset.page) &&
    same(theme.title.styles.color, preset.text) &&
    same(theme.linkListItem.styles.backgroundColor, preset.button) &&
    same(theme.linkListItem.styles.color, preset.buttonText)
  );
}

/** WCAG contrast between two hex colours, 1 (none) to 21. */
export function contrast(a: string, b: string) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** A picked image: an object URL for the preview and the file to upload on save. */
export type PickedImage = { url: string; file?: File } | null;

export type TextPart = "title" | "subtitle";

export type ThemeAction =
  | { type: "background-color"; value: string }
  | { type: "background-image"; device: "desktop" | "mobile"; image: PickedImage }
  /** Sets the width and scales the height with it, keeping the logo's proportions. */
  | { type: "logo-scale"; width: number }
  | { type: "preset"; preset: ThemePreset }
  | { type: "logo-image"; image: PickedImage }
  | { type: "text"; part: TextPart; value: string }
  | { type: "text-color"; part: TextPart; value: string }
  | { type: "text-size"; part: TextPart; key: "fontSize" | "fontWeight"; value: number }
  | { type: "button-color"; key: "color" | "backgroundColor"; value: string }
  | { type: "button-radius"; value: number }
  | { type: "replace"; theme: LinktreeTheme };

function revoke(url: string | null | undefined) {
  if (url?.startsWith("blob:")) URL.revokeObjectURL(url);
}

/** An immer reducer: it mutates the draft it is handed. */
export function themeReducer(draft: LinktreeTheme, action: ThemeAction): LinktreeTheme | void {
  switch (action.type) {
    case "background-color":
      draft.background.styles.backgroundColor = action.value;
      return;
    case "background-image": {
      const bg = draft.background;
      if (action.device === "desktop") {
        revoke(bg.desktopBgImgUrl);
        bg.desktopBgImgUrl = action.image?.url ?? null;
        bg.desktopBgImgFile = action.image?.file ?? null;
      } else {
        revoke(bg.mobileBgImgUrl);
        bg.mobileBgImgUrl = action.image?.url ?? null;
        bg.mobileBgImgFile = action.image?.file ?? null;
      }
      return;
    }
    case "logo-scale": {
      const { width = 50, height = 50 } = draft.logo.styles;
      const ratio = Number(height) / (Number(width) || 1);
      draft.logo.styles.width = action.width;
      draft.logo.styles.height = Math.round(action.width * ratio);
      return;
    }
    case "preset": {
      const { page, text, button, buttonText } = action.preset;
      draft.background.styles.backgroundColor = page;
      draft.title.styles.color = text;
      draft.subtitle.styles.color = text;
      draft.linkListItem.styles.backgroundColor = button;
      draft.linkListItem.styles.color = buttonText;
      return;
    }
    case "logo-image":
      revoke(draft.logo.logoUrl);
      draft.logo.logoUrl = action.image?.url ?? null;
      draft.logo.logoFile = action.image?.file ?? null;
      return;
    case "text":
      draft[action.part].text = action.value;
      return;
    case "text-color":
      draft[action.part].styles.color = action.value;
      return;
    case "text-size":
      draft[action.part].styles[action.key] = action.value;
      return;
    case "button-color":
      draft.linkListItem.styles[action.key] = action.value;
      return;
    case "button-radius":
      draft.linkListItem.styles.borderRadius = action.value;
      return;
    case "replace":
      return action.theme;
  }
}
