export const FB_PIXEL_ID = process.env.NEXT_PUBLIC_FACEBOOK_PIXEL_ID;

export const fbPageview = () => {
  //@ts-ignore
  if (window.fbq) window.fbq("track", "PageView");
};

export const fbEvent = (name, options = {}, custom = true) => {
  if (custom) {
    //@ts-ignore
    if (window.fbq) window.fbq("trackCustom", name, options);
  } else {
    //@ts-ignore
    if (window.fbq) window.fbq("track", name, options);
  }
};

export const fbConsent = (access: "grant" | "revoke") => {
  //@ts-ignore
  if (window.fbq) window.fbq("consent", access);
};
