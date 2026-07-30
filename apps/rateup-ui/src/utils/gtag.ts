import { isProduction } from "./constants.ts";
import { fbEvent } from "./fbpixel.ts";

const analyseEvent = ({
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
  globalThis.gtag("event", action, {
    event_category: category,
    event_label: label ?? undefined,
    value: value ?? undefined,
  });
};

export const setGAConsent = (consent: "granted" | "denied") => {
  if (typeof globalThis !== "undefined" && typeof globalThis.gtag === "function") {
    globalThis.gtag("consent", "update", {
      ad_storage: consent,
      analytics_storage: consent,
    });
  } else {
    console.warn("gtag not loaded yet");
  }
};

// For button click event
export const gAnalyticsAndFbEvent = (gAcategory: string, fbEventName: string, label: string) => {
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
