import { isProduction } from "./constants";
import { fbEvent } from "./fbpixel";

export const GA_TRACKING_ID = process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID;

export const analyseEvent = ({
  action,
  category,
  label,
  value,
}: {
  action: string;
  category: string;
  label?: string;
  value?: any;
}) => {
  window.gtag("event", action, {
    event_category: category,
    event_label: label ?? undefined,
    value: value ?? undefined,
  });
};

export const setGAConsent = (consent: "granted" | "denied") => {
  if (typeof window !== "undefined" && typeof window.gtag === "function") {
    window.gtag("consent", "update", {
      ad_storage: consent,
      analytics_storage: consent,
    });
  } else {
    console.warn("gtag not loaded yet");
  }
};

//For button click event
export const gAnalyticsAndFbEvent = (gAcategory, fbEventName, label) => {
  if (isProduction) {
    analyseEvent({
      action: "button_click",
      category: gAcategory,
      label,
    });
    fbEvent(fbEventName, {
      label,
    });
  }
};
