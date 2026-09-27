import type { LinkProps } from "@tanstack/react-router";
import type { ReactNode } from "react";

export interface Capability {
  label: string;
  body: string;
  /** The product page that goes deeper. Absent where no such page exists yet. */
  to?: LinkProps["to"];
  /** Drawn on a 24-box at a 1.75 stroke, so the grid reads as one icon set. */
  icon: ReactNode;
}

export const CAPABILITIES: readonly Capability[] = [
  {
    label: "Loyalty & Referrals",
    body: "Points, VIP tiers and rewards on WhatsApp, with a QR member card and a cashier screen.",
    to: "/products/whatsapp-loyalty",
    icon: (
      <path d="M12 3.4l2.6 5.3 5.9.85-4.25 4.15 1 5.9-5.25-2.8-5.25 2.8 1-5.9L3.5 9.55l5.9-.85L12 3.4Z" />
    ),
  },
  {
    label: "Feedback & Reviews",
    body: "A WhatsApp survey after every visit. Happy customers are sent on to your Google reviews.",
    to: "/products/whatsapp-feedback",
    icon: (
      <>
        <path d="M20.5 12c0 4-3.8 7-8.5 7-1 0-2-.15-2.9-.4L4 20l1.3-3.6A6.9 6.9 0 0 1 3.5 12c0-4 3.8-7 8.5-7s8.5 3 8.5 7Z" />
        <path d="m12 8.4 1.25 2.55 2.8.4-2.02 1.98.48 2.8L12 14.8l-2.51 1.33.48-2.8-2.02-1.98 2.8-.4L12 8.4Z" />
      </>
    ),
  },
  {
    label: "Campaigns",
    body: "Scheduled WhatsApp broadcasts with test sends, paced delivery and retries for failed sends.",
    to: "/products/whatsapp-broadcast",
    icon: (
      <>
        <path d="M3.4 11.2 20.6 4.2l-6 15.9-3.15-6.75-3.15-1.35" />
        <path d="m11.45 13.35 4.15-6.4" />
      </>
    ),
  },
  {
    label: "Shared Inbox",
    body: "WhatsApp, Instagram and Messenger in one team inbox, with assignment, mentions and tags.",
    to: "/products/omnichannel-inbox",
    icon: (
      <>
        <path d="M3.5 13.5 6 5.5h12l2.5 8v4a1.5 1.5 0 0 1-1.5 1.5H5a1.5 1.5 0 0 1-1.5-1.5v-4Z" />
        <path d="M3.5 13.5h4.6l1.2 2.4h5.4l1.2-2.4h4.6" />
      </>
    ),
  },
  {
    label: "Automation",
    body: "No-code flows and keyword chatbots that reply, qualify and hand over to your team.",
    to: "/products/ai-automation",
    icon: (
      <>
        <path d="M4 6h7.5" />
        <path d="M4 18h7.5" />
        <path d="M11.5 6a4 4 0 0 0 4 4H20" />
        <path d="M11.5 18a4 4 0 0 1 4-4H20" />
        <circle cx="20" cy="10" r="1.6" />
        <circle cx="20" cy="14" r="1.6" />
      </>
    ),
  },
  {
    label: "Meta AI Agents",
    body: "An AI agent that answers from your own knowledge base and works through connected tools.",
    to: "/products/meta-ai-agent",
    icon: (
      <>
        <rect x="4" y="7" width="16" height="11.5" rx="3.2" />
        <path d="M12 3.2v3.8" />
        <circle cx="9.2" cy="12.6" r="1.15" fill="currentColor" stroke="none" />
        <circle cx="14.8" cy="12.6" r="1.15" fill="currentColor" stroke="none" />
        <path d="M9.8 15.8h4.4" />
      </>
    ),
  },
  {
    label: "Lead Pipelines",
    body: "A drag-and-drop pipeline that turns conversations into leads, stages and a forecast.",
    to: "/products/pipeline",
    icon: <path d="M3.6 5h16.8l-6.3 7.1v6L10 20v-7.9L3.6 5Z" />,
  },
  {
    label: "Surveys & Web Forms",
    body: "Surveys on WhatsApp or the web, in your brand's theme and your customers' language.",
    to: "/products/whatsapp-survey",
    icon: (
      <>
        <rect x="5" y="3.5" width="14" height="17" rx="2.4" />
        <path d="m8.4 9 1.3 1.3 2.3-2.5M14 9.2h2M8.6 14.6h7" />
      </>
    ),
  },
];
