import type { LinkProps } from "@tanstack/react-router";
import type { ReactNode } from "react";

export interface Capability {
  label: string;
  body: string;
  /** The product page that goes deeper. Absent where no such page exists yet. */
  to?: LinkProps["to"];
  /** Drawn on a 24-box at a 1.75 stroke, so the lists read as one icon set. */
  icon: ReactNode;
  isNew?: boolean;
}

export type JobAnchor = "support" | "sell" | "bring-them-back";

export interface Job {
  label: string;
  /** The id of this job's band further down the page (JobBands). */
  anchor: JobAnchor;
  title: string;
  body: string;
  isNew?: boolean;
  capabilities: readonly Capability[];
}

/** What RateUp does, grouped by the hero's line: support, sell, and bring them back. */
export const JOBS: readonly Job[] = [
  {
    label: "Support",
    anchor: "support",
    title: "Answer every chat in seconds",
    body: "One inbox for your whole team, with saved replies and automations.",
    capabilities: [
      {
        label: "Shared Inbox",
        body: "WhatsApp, Instagram and Messenger in one team inbox.",
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
        body: "No-code flows and keyword chatbots that hand over to your team.",
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
        body: "An AI agent that answers from your own knowledge base.",
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
    ],
  },
  {
    label: "Sell",
    anchor: "sell",
    title: "Take orders right in the chat",
    body: "Send products, build the cart and get paid, without a website.",
    isNew: true,
    capabilities: [
      {
        label: "Shop & Checkout",
        body: "Products, carts and payment links, right in the chat.",
        to: "/products/social-commerce",
        isNew: true,
        icon: (
          <>
            <path d="M5 8h14l-1.2 11a1.8 1.8 0 0 1-1.8 1.6H8a1.8 1.8 0 0 1-1.8-1.6L5 8Z" />
            <path d="M9 8V6.5a3 3 0 0 1 6 0V8" />
          </>
        ),
      },
      {
        label: "Lead Pipelines",
        body: "Turn conversations into leads, stages and a forecast.",
        to: "/products/pipeline",
        icon: <path d="M3.6 5h16.8l-6.3 7.1v6L10 20v-7.9L3.6 5Z" />,
      },
      {
        label: "Shopify & WooCommerce",
        body: "Connect your store and message customers about their orders.",
        to: "/integrations",
        icon: (
          <>
            <path d="M10 13.5a4.2 4.2 0 0 0 6.3.45l2.6-2.6a4.2 4.2 0 0 0-5.95-5.95l-1.45 1.45" />
            <path d="M14 10.5a4.2 4.2 0 0 0-6.3-.45l-2.6 2.6a4.2 4.2 0 0 0 5.95 5.95l1.45-1.45" />
          </>
        ),
      },
    ],
  },
  {
    label: "Bring them back",
    anchor: "bring-them-back",
    title: "Turn buyers into regulars",
    body: "Rewards, offers and check-ins that bring customers back.",
    capabilities: [
      {
        label: "Loyalty & Referrals",
        body: "Points, VIP tiers and rewards on WhatsApp.",
        to: "/products/whatsapp-loyalty",
        icon: (
          <path d="M12 3.4l2.6 5.3 5.9.85-4.25 4.15 1 5.9-5.25-2.8-5.25 2.8 1-5.9L3.5 9.55l5.9-.85L12 3.4Z" />
        ),
      },
      {
        label: "Campaigns",
        body: "Scheduled broadcasts, with delivery, reads and replies.",
        to: "/products/whatsapp-broadcast",
        icon: (
          <>
            <path d="M3.4 11.2 20.6 4.2l-6 15.9-3.15-6.75-3.15-1.35" />
            <path d="m11.45 13.35 4.15-6.4" />
          </>
        ),
      },
      {
        label: "Feedback & Surveys",
        body: "A survey after every visit. Happy customers go on to your Google reviews.",
        to: "/products/whatsapp-feedback",
        icon: (
          <>
            <path d="M20.5 12c0 4-3.8 7-8.5 7-1 0-2-.15-2.9-.4L4 20l1.3-3.6A6.9 6.9 0 0 1 3.5 12c0-4 3.8-7 8.5-7s8.5 3 8.5 7Z" />
            <path d="m12 8.4 1.25 2.55 2.8.4-2.02 1.98.48 2.8L12 14.8l-2.51 1.33.48-2.8-2.02-1.98 2.8-.4L12 8.4Z" />
          </>
        ),
      },
    ],
  },
];

/* Blue, amber, green: the overview cards and the bands below share one accent per job. */
const JOB_TAG_STYLES: Record<JobAnchor, { pill: string; dot: string; icon: ReactNode }> = {
  support: {
    pill: "border-ru-blue-200 bg-ru-blue-50 text-ru-blue-700",
    dot: "bg-ru-blue-600 text-white",
    icon: (
      <>
        <path d="M4 13v-1a8 8 0 0 1 16 0v1" />
        <rect x="3.5" y="12.5" width="4" height="6" rx="1.6" />
        <rect x="16.5" y="12.5" width="4" height="6" rx="1.6" />
        <path d="M18.5 18.5c0 1.4-1.6 2.3-4.5 2.3" />
      </>
    ),
  },
  sell: {
    pill: "border-ru-amber-200 bg-ru-amber-50 text-ru-amber-700",
    dot: "bg-ru-star-cta text-ru-blue-900",
    icon: (
      <>
        <path d="M5 8h14l-1.2 11a1.8 1.8 0 0 1-1.8 1.6H8a1.8 1.8 0 0 1-1.8-1.6L5 8Z" />
        <path d="M9 8V6.5a3 3 0 0 1 6 0V8" />
      </>
    ),
  },
  "bring-them-back": {
    pill: "border-ru-green-300/60 bg-ru-green-50 text-ru-green-700",
    dot: "bg-ru-green-500 text-white",
    icon: (
      <>
        <path d="M4.5 12a7.5 7.5 0 0 1 13-5.1L20 9.5" />
        <path d="M20 4.5v5h-5" />
        <path d="M19.5 12a7.5 7.5 0 0 1-13 5.1L4 14.5" />
        <path d="M4 19.5v-5h5" />
      </>
    ),
  },
};

export function JobTag({
  anchor,
  label,
  size = "md",
  children,
}: Readonly<{ anchor: JobAnchor; label: string; size?: "md" | "lg"; children?: ReactNode }>) {
  const style = JOB_TAG_STYLES[anchor];
  const large = size === "lg";

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border font-display font-extrabold tracking-[-0.01em] ${style.pill} ${large ? "py-1.5 pr-4 pl-1.5 text-[17px]/none" : "py-1 pr-3.5 pl-1 text-[15px]/none"}`}
    >
      <span
        className={`flex flex-none items-center justify-center rounded-full ${style.dot} ${large ? "size-8" : "size-7"}`}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={large ? "size-4.5" : "size-4"}
          aria-hidden="true"
        >
          {style.icon}
        </svg>
      </span>
      {label}
      {children}
    </span>
  );
}
