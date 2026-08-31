import { webImagesBaseUrl } from "../../constants/constants.js";

/** Fixed brand facts every email footer repeats. */
export const brand = {
  name: "RateUp",
  /** Shown in the footer blurb. */
  tagline:
    "RateUp helps teams collect feedback over web and WhatsApp, and turn it into reviews, loyalty, and repeat business.",
  website: "https://rateup.app",
  supportEmail: "hello@rateup.app",
  address: ["Kasaragod, Kerala", "India"],
} as const;

/**
 * The Design System V2 horizontal lockup — the same asset rateup-ui exports as
 * `rateupLogo`. It is the transparent *colour* wordmark, drawn for light
 * surfaces, which is what the layout sits it on (the white card, not a dark
 * band). On a navy or photographic surface use `rateup-white.png` instead.
 *
 * The artwork is 2500x992, so anything rendering it must hold 2.52:1.
 */
export function logoUrl(): string {
  return `${webImagesBaseUrl()}/images/rateup.png`;
}

export function emailImage(fileName: string): string {
  return `${webImagesBaseUrl()}/images/email/${fileName}`;
}

export const socialLinks = [
  { label: "Website", href: brand.website, icon: "website_logo.png" },
  {
    label: "LinkedIn",
    href: "https://www.linkedin.com/company/rateup",
    icon: "linkedin_logo.png",
  },
  {
    label: "Play Store",
    href: "https://play.google.com/store/apps/details?id=com.rateupapp.rateup",
    icon: "playstore_logo.png",
  },
] as const;
