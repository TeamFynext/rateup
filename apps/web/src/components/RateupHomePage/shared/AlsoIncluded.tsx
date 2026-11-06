import { Link, type LinkProps } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { ArrowRight } from "./home-ui";

interface Extra {
  title: string;
  body: string;
  to?: LinkProps["to"];
  icon: ReactNode;
}

/* What the three jobs lean on but none of them owns. */
const EXTRAS: readonly Extra[] = [
  {
    title: "Mobile app",
    body: "Inbox, flows, forms and the loyalty cashier on iOS and Android, for the shop floor.",
    icon: (
      <>
        <rect x="6.5" y="2.5" width="11" height="19" rx="2.5" />
        <path d="M10.5 18.5h3" />
      </>
    ),
  },
  {
    title: "QR codes & links",
    body: "Branded QR codes and short links that open your survey, loyalty sign-up or form.",
    to: "/products/qr-studio",
    icon: (
      <>
        <rect x="3.5" y="3.5" width="6.5" height="6.5" rx="1.2" />
        <rect x="14" y="3.5" width="6.5" height="6.5" rx="1.2" />
        <rect x="3.5" y="14" width="6.5" height="6.5" rx="1.2" />
        <path d="M14 14h2.5v2.5H14zM18 18h2.5v2.5H18zM18 14h2.5M14 18v2.5" />
      </>
    ),
  },
  {
    title: "Integrations & API",
    body: "Connect your store, POS and CRM, or build on webhooks and the REST API.",
    to: "/integrations",
    icon: (
      <>
        <path d="M10 13.5a4.2 4.2 0 0 0 6.3.45l2.6-2.6a4.2 4.2 0 0 0-5.95-5.95l-1.45 1.45" />
        <path d="M14 10.5a4.2 4.2 0 0 0-6.3-.45l-2.6 2.6a4.2 4.2 0 0 0 5.95 5.95l1.45-1.45" />
      </>
    ),
  },
];

const ITEM_CLASS =
  "group flex h-full items-start gap-3.5 rounded-2xl border border-ru-n-200 bg-white p-5 transition-all hover:border-ru-blue-300 hover:shadow-md motion-reduce:transition-none";

function ExtraItem({ extra }: Readonly<{ extra: Extra }>) {
  const content = (
    <>
      <span className="flex size-10 flex-none items-center justify-center rounded-[10px] border border-ru-blue-100 bg-ru-blue-50 text-ru-blue-600">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="size-5"
          aria-hidden="true"
        >
          {extra.icon}
        </svg>
      </span>
      <span className="min-w-0">
        <span className="flex items-center gap-1.5 font-display text-[17px] font-bold tracking-[-0.01em] text-ru-n-700">
          {extra.title}
          {extra.to && (
            <ArrowRight className="size-4 -translate-x-1 text-ru-blue-600 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100 motion-reduce:transition-none" />
          )}
        </span>
        <span className="mt-1 block text-[14.5px]/[1.5] text-ru-n-500">{extra.body}</span>
      </span>
    </>
  );

  return extra.to ? (
    <Link to={extra.to} className={ITEM_CLASS}>
      {content}
    </Link>
  ) : (
    <div className={ITEM_CLASS}>{content}</div>
  );
}

export default function AlsoIncluded() {
  return (
    <section className="border-b border-ru-n-100 bg-ru-n-25 px-5 py-12 sm:py-14">
      <div className="mx-auto max-w-280">
        <h2 className="mb-6 text-center font-display text-[clamp(1.375rem,2.6vw,1.75rem)] font-bold tracking-[-0.02em] text-ru-n-700">
          Also in RateUp
        </h2>
        <ul className="grid list-none gap-3.5 p-0 md:grid-cols-3">
          {EXTRAS.map((extra) => (
            <li key={extra.title}>
              <ExtraItem extra={extra} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
