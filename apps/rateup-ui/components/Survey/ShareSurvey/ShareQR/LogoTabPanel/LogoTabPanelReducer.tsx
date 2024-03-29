const initialLogoTabPanelState = {
  qrBgColor: "#FFFFFF",
  qrColor: "#000000",
  logoSize: 75,
  logoFillType: "contain",
  logoBorderRadius: 50,
  logoFile: null,
};

const logoTabPanelReducer = (state, action) => {
  const payload = action.payload;
  switch (action.type) {
    case "file-input": {
      state["logoFile"] = payload;
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
