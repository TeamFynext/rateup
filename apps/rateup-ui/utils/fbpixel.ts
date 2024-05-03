export const FB_PIXEL_ID = process.env.NEXT_PUBLIC_FACEBOOK_PIXEL_ID;

export const fbPageview = () => {
  //@ts-ignore
  window.fbq("track", "PageView");
};

export const fbEvent = (name, options = {}, custom = true) => {
  if (custom) {
    //@ts-ignore
    window.fbq("trackCustom", name, options);
  } else {
    //@ts-ignore
    window.fbq("track", name, options);
  }
};
