import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { ArrowRight } from "@/components/RateupHomePage/shared/home-ui";

/**
 * "Pick the job you need doing first" — six cards, each a link into the rest of the cluster.
 *
 * These are the page's main internal links: the API page is the hub, and every product built on
 * the API is one card away from it.
 */

const JOBS: readonly { to: string; title: string; body: string; icon: ReactNode }[] = [
  {
    to: "/products/whatsapp-loyalty",
    title: "WhatsApp loyalty",
    body: "Points, tiers and referral codes that live in the thread — no app to install.",
    icon: <path d="M12 2l2.4 6.9H22l-6 4.4 2.3 7-6.3-4.6L5.7 20.3 8 13.3l-6-4.4h7.6z" />,
  },
  {
    to: "/products/whatsapp-feedback",
    title: "Customer feedback",
    body: "Ask one question in chat or a full web survey, and read answers beside the conversation.",
    icon: (
      <>
        <path d="M9 11l3 3L22 4" />
        <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
      </>
    ),
  },
  {
    to: "/products/whatsapp-broadcast",
    title: "Broadcasts & drip campaigns",
    body: "Send an approved template to a segment, then follow up on who opened and who bought.",
    icon: (
      <>
        <path d="M3 11l18-5v12L3 14z" />
        <path d="M11.6 16.8a3 3 0 11-5.8-1.6" />
      </>
    ),
  },
  {
    to: "/products/omnichannel-inbox",
    title: "Shared inbox",
    body: "Your whole team on one number, with assignment, labels and stages.",
    icon: (
      <>
        <path d="M22 12h-6l-2 3h-4l-2-3H2" />
        <path d="M5.5 5h13l3.5 7v7a2 2 0 01-2 2H4a2 2 0 01-2-2v-7z" />
      </>
    ),
  },
  {
    to: "/products/ai-automation",
    title: "AI automation",
    body: "Triggers, chatbots and the Meta AI agent answering before anyone opens the app.",
    icon: (
      <>
        <path d="M12 2v3" />
        <path d="M6 8h12a2 2 0 012 2v8a2 2 0 01-2 2H6a2 2 0 01-2-2v-8a2 2 0 012-2z" />
        <path d="M9 13v2M15 13v2" />
      </>
    ),
  },
  {
    to: "/integrations/shopify",
    title: "Shopify integration",
    body: "Order and cart events trigger the message, and checkout links send themselves.",
    icon: (
      <>
        <path d="M6 6h15l-1.6 9H7.5z" />
        <path d="M6 6L5 3H3" />
        <path d="M9 20a1 1 0 100-2 1 1 0 000 2M18 20a1 1 0 100-2 1 1 0 000 2" />
      </>
    ),
  },
];

export default function UseCases() {
  return (
    <section className="border-t border-ru-n-100 bg-ru-n-50">
      <div className="mx-auto max-w-280 px-5 py-[clamp(3rem,7vw,5.5rem)]">
        <span className="text-[11.5px] font-semibold tracking-[0.1em] text-ru-blue-500 uppercase">
          Where teams start
        </span>
        <h2 className="mt-3 mb-8 font-display text-[clamp(1.625rem,3.6vw,2.25rem)]/[1.12] font-bold tracking-[-0.028em] text-balance text-ru-n-700">
          Pick the job you need doing first
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {JOBS.map((job) => (
            <Link
              key={job.to}
              to={job.to}
              className="group flex flex-col gap-3 rounded-xl bg-white p-8 shadow-xs ring-1 ring-ru-n-200 ring-inset transition-all hover:shadow-md hover:ring-ru-n-300"
            >
              <span className="flex size-10 items-center justify-center rounded-lg border border-ru-blue-200 bg-ru-blue-50 text-ru-blue-600">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  {job.icon}
                </svg>
              </span>
              <h3 className="font-display text-[22px]/[1.25] font-bold tracking-[-0.018em] text-ru-n-700">
                {job.title}
              </h3>
              <p className="flex-1 text-[14.5px]/[1.55] text-ru-n-500">{job.body}</p>
              <span className="inline-flex items-center gap-1.5 text-sm font-medium text-ru-blue-600">
                Learn more
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
