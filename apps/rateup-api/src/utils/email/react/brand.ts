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
 * The horizontal lockup. Its baked-in background is `#111A32`, which is why the
 * layout's logo band uses the `header` colour token — the two must stay in sync.
 */
export function logoUrl(): string {
  return `${webImagesBaseUrl()}/images/rateup-logo-horizontal-white-transparent.png`;
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
