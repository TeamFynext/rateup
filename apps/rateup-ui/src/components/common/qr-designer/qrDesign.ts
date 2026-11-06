import type { TFunction } from "i18next";
import type { CSSProperties } from "react";

import { luminance } from "@/utils/color.ts";

export const TRANSPARENT = "transparent";

/**
 * A saved QR design, as the share-settings endpoint and a link page's `shareSettings` store it.
 * `logoFile` is a picked File until it is uploaded, then a URL.
 */
export interface QrDesign {
  qrBgColor: string;
  qrColor: string;
  logoSize: number;
  logoFillType: CSSProperties["objectFit"];
  logoBorderRadius: number;
  logoFile: string | File | null;
  isLogoEnabled?: boolean;
}

export const DEFAULT_QR_DESIGN: QrDesign = {
  qrBgColor: "#FFFFFF",
  qrColor: "#000000",
  logoSize: 75,
  logoFillType: "contain",
  logoBorderRadius: 50,
  logoFile: null,
  isLogoEnabled: true,
};

/** The old designer's preview was 300px wide and `logoSize` is still stored in its pixels. */
export const LOGO_SIZE_BASE = 300;

export interface QrPreset {
  id: string;
  label: string;
  code: string;
  background: string;
}

export function qrPresets(t: TFunction): QrPreset[] {
  return [
    { id: "classic", label: t("Classic"), code: "#000000", background: "#ffffff" },
    { id: "navy", label: t("Navy"), code: "#0f2540", background: "#ffffff" },
    { id: "blue", label: t("Blue"), code: "#1c518e", background: "#ffffff" },
    { id: "green", label: t("Green"), code: "#177f45", background: "#ffffff" },
    { id: "warm", label: t("Warm"), code: "#7c2d12", background: "#fff7ed" },
    { id: "clear", label: t("No background"), code: "#000000", background: TRANSPARENT },
  ];
}

export const LOGO_SHAPES = [
  { id: "square", radius: 0 },
  { id: "rounded", radius: 20 },
  { id: "circle", radius: 50 },
] as const;

/**
 * Why a colour pair may not scan, or null when it will. Scanners want dark modules on a light
 * ground with real contrast; a transparent code is judged against the white it usually prints on.
 */
export function scanWarning(code: string, background: string, t: TFunction): string | null {
  const ground = background === TRANSPARENT ? "#ffffff" : background;
  const lc = luminance(code);
  const lb = luminance(ground);
  if (lc > lb) {
    return t("A light code on a dark background won't scan on every phone. Swap the colours.");
  }
  if ((lb + 0.05) / (lc + 0.05) < 4) {
    return t("These colours are too close. Some phones won't read the code.");
  }
  return null;
}
