import { isProduction } from "./constants";
import { fbEvent } from "./fbpixel";

export const GA_TRACKING_ID = process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID;

export const pageView = (url) => {
  window.gtag("config", GA_TRACKING_ID, {
    page_path: url,
  });
};

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

export const setGAConsent = (access: "granted" | "denied") => {
  window.gtag("consent", "update", {
    analytics_storage: access,
  });
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
