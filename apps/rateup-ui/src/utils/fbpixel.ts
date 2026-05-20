export const FB_PIXEL_ID = import.meta.env.VITE_FACEBOOK_PIXEL_ID;
export const GTM_ID = "GTM-NDC3D7DP";
export const FB_DOMAIN_VERIFICATION = "f2o3kii5sp01a6xx6axifkbk7aegai";
export const PINTEREST_VERIFICATION = "a755ff9896b0315145ef35f5fe011cf8";
export const fbPageview = () => {
  if (globalThis.fbq) globalThis.fbq("track", "PageView");
};

export const fbEvent = (name, options = {}, custom = true) => {
  if (custom) {
    if (globalThis.fbq) globalThis.fbq("trackCustom", name, options);
  } else if (globalThis.fbq) globalThis.fbq("track", name, options);
};

export const fbConsent = (access: "grant" | "revoke") => {
  if (globalThis.fbq) globalThis.fbq("consent", access);
};
