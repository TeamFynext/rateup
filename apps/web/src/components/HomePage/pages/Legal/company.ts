import type { LinkProps } from "@tanstack/react-router";

export const LEGAL_ENTITY = "Uprate Technologies Private Limited";
export const LEGAL_EMAIL = "hello@rateup.app";
export const LEGAL_JURISDICTION = "Kochi, Kerala, India";

/** Every legal document, in the order the footer and each page's "Other policies" list them. */
export const LEGAL_DOCS: readonly { to: LinkProps["to"]; label: string }[] = [
  { to: "/terms-of-service", label: "Terms of Service" },
  { to: "/privacy-policy", label: "Privacy Policy" },
  { to: "/refund-policy", label: "Refund & Cancellation" },
  { to: "/acceptable-use", label: "Acceptable Use" },
  { to: "/dpa", label: "Data Processing Agreement" },
  { to: "/subprocessors", label: "Subprocessors" },
];
