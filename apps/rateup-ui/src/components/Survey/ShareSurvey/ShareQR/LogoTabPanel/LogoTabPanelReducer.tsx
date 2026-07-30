import type { QrLogoPanelState } from "./index.tsx";
const initialLogoTabPanelState = {
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
) => {
  const payload = action.payload;
  switch (action.type) {
    case "file-input": {
      state["logoFile"] = payload;
      if (payload instanceof File) {
        state["isLogoEnabled"] = true;
      }
      break;
    }
    case "logo-image-switch": {
      state["isLogoEnabled"] = payload;
      if (!payload && !state["logoFile"]) {
        state["logoFile"] = null;
      }
      break;
    }
    case "logo-size": {
      state["logoSize"] = payload;
      break;
    }
    case "logo-fill-type": {
      state["logoFillType"] = payload;
      break;
    }
    case "logo-border-radius": {
      state["logoBorderRadius"] = payload;
      break;
    }
    case "qr-bg-color": {
      state["qrBgColor"] = payload;
      break;
    }
    case "qr-color": {
      state["qrColor"] = payload;
      break;
    }
    case "update-state-from-api": {
      return payload;
    }
  }
};

export { logoTabPanelReducer, initialLogoTabPanelState };
