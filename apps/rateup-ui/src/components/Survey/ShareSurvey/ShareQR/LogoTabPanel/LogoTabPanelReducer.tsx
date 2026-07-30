import type { CSSProperties } from "react";

import type { QrLogoPanelState } from "./index.tsx";
const initialLogoTabPanelState: QrLogoPanelState = {
  qrBgColor: "#FFFFFF",
  qrColor: "#000000",
  logoSize: 75,
  logoFillType: "contain",
  logoBorderRadius: 50,
  logoFile: null,
  isLogoEnabled: true,
};

const logoTabPanelReducer = (
  state: QrLogoPanelState,
  action: { type: string; payload?: unknown },
): void => {
  // Each action carries the scalar for the field it names; the action type is a
  // bare string, so the payload cannot be discriminated on it.
  const value = action.payload as string & number & boolean & CSSProperties["objectFit"];
  const payload = action.payload;
  switch (action.type) {
    case "file-input": {
      state["logoFile"] = value;
      if (payload instanceof File) {
        state["isLogoEnabled"] = true;
      }
      break;
    }
    case "logo-image-switch": {
      state["isLogoEnabled"] = value;
      if (!payload && !state["logoFile"]) {
        state["logoFile"] = null;
      }
      break;
    }
    case "logo-size": {
      state["logoSize"] = value;
      break;
    }
    case "logo-fill-type": {
      state["logoFillType"] = value;
      break;
    }
    case "logo-border-radius": {
      state["logoBorderRadius"] = value;
      break;
    }
    case "qr-bg-color": {
      state["qrBgColor"] = value;
      break;
    }
    case "qr-color": {
      state["qrColor"] = value;
      break;
    }
    case "update-state-from-api": {
      return payload;
    }
  }
};

export { logoTabPanelReducer, initialLogoTabPanelState };
