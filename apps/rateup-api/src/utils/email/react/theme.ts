import type { TailwindConfig } from "react-email";
import plugin from "tailwindcss/plugin";

/**
 * The RateUp email design system.
 *
 * A one-for-one port of React Email's "Collage" Tailwind config — same type
 * scale, same shadow, same font split, same `mobile` variant — with RateUp's
 * palette in place of Collage's own. Keep the structure aligned with
 * https://github.com/resend/react-email/tree/canary/apps/demo/emails
 * so the two stay comparable.
 */
const colors = {
  /** Page background behind the card. */
  canvas: "#EEF2F7",
  /** The card itself. */
  bg: "#FFFFFF",
  /** Full-width secondary bands and inset panels. */
  "bg-2": "#F7F9FC",
  fg: "#0D1B2A",
  "fg-2": "#40566F",
  "fg-3": "#8397AC",
  "fg-inverted": "#FFFFFF",
  stroke: "#DCE4EE",
  brand: "#1C518E",
  "brand-soft": "#EAF1F9",
  /** Summary rows — line items in a billing breakdown. */
  summary: "#E8EEF5",
  /** The total row that closes a summary, one step darker so it reads as the sum. */
  "summary-total": "#C7D5E5",
  /** The orange from the logo's star, for small emphasis only. */
  accent: "#F5921E",
  danger: "#B42318",
  "danger-bg": "#FEF3F2",
  "danger-stroke": "#FDA29B",
  success: "#067647",
  "success-bg": "#ECFDF3",
  "success-stroke": "#ABEFC6",
  warning: "#B54708",
  "warning-bg": "#FFFAEB",
  "warning-stroke": "#FEDF89",
} as const;

/**
 * Collage's type scale, exposed as `font-<step>` utilities. Every size ships its
 * own line height, tracking and weight so templates never pair them by hand.
 */
const fontScale = {
  11: { fontSize: "11px", lineHeight: "1.5", letterSpacing: "-0.033px", fontWeight: "300" },
  13: { fontSize: "13px", lineHeight: "1.5", letterSpacing: "-0.039px", fontWeight: "300" },
  14: { fontSize: "14px", lineHeight: "1.5" },
  15: { fontSize: "15px", lineHeight: "1.5", letterSpacing: "-0.075px", fontWeight: "500" },
  20: { fontSize: "20px", lineHeight: "1.2", letterSpacing: "-0.2px" },
  32: { fontSize: "32px", lineHeight: "1.2", letterSpacing: "-0.6px" },
  48: { fontSize: "48px", lineHeight: "1", letterSpacing: "-1.44px" },
  58: { fontSize: "58px", lineHeight: "1", letterSpacing: "-1.74px" },
  88: { fontSize: "88px", lineHeight: "1", letterSpacing: "-2.64px" },
} as const;

export const rateupTailwindConfig: TailwindConfig = {
  plugins: [
    plugin(({ addUtilities, addVariant }) => {
      addVariant("mobile", "@media (max-width: 600px)");
      const utilities: Record<string, Record<string, string>> = {};
      for (const [step, token] of Object.entries(fontScale)) {
        utilities[`.font-${step}`] = token;
      }
      addUtilities(utilities);
    }),
  ],
  theme: {
    extend: {
      colors,
      boxShadow: {
        // Collage's card shadow, verbatim. Gmail, Outlook and Yahoo strip
        // box-shadow, so this only lands in Apple Mail and iOS; the card's
        // `stroke` border is what defines its edge everywhere else.
        card: "0px 76px 21px 0px rgba(193,195,193,0), 0px 49px 19px 0px rgba(193,195,193,0.01), 0px 27px 16px 0px rgba(193,195,193,0.05), 0px 12px 12px 0px rgba(193,195,193,0.09), 0px 3px 7px 0px rgba(193,195,193,0.1)",
      },
      fontFamily: {
        // Collage's split: display headings in the websafe grotesque stack,
        // running text in Inter, which falls back to Arial when a client
        // refuses web fonts.
        sans: ["Arial", "Helvetica", "sans-serif"],
        inter: ["Inter", "Arial", "sans-serif"],
      },
    },
  },
};
