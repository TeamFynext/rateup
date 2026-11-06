import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { BAND, SectionHead } from "../shared/section";

/** Who broadcasts, and what they send. Each card links into the cluster where one exists. */

interface UseCase {
  title: string;
  body: ReactNode;
  tile: string;
  icon: ReactNode;
}

const USE_CASES: readonly UseCase[] = [
  {
    title: "Retail chains",
    body: "Festive offers to every store's catchment, and new-store openings announced the morning they happen.",
    tile: "border-ru-green-100 bg-ru-green-50 text-ru-green-600",
    icon: (
      <>
        <path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7" />
        <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
        <path d="M15 22v-4a3 3 0 0 0-6 0v4" />
        <path d="M2 7h20" />
      </>
    ),
  },
  {
    title: "D2C ecommerce",
    body: (
      <>
        New-collection launches to your list, while order updates and abandoned-checkout reminders
        run on their own through the{" "}
        <Link
          to="/integrations/shopify"
          className="font-medium text-ru-blue-600 underline underline-offset-2 hover:text-ru-blue-700"
        >
          Shopify integration
        </Link>
        .
      </>
    ),
    tile: "border-ru-amber-200 bg-ru-amber-50 text-ru-amber-700",
    icon: (
      <>
        <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
        <path d="M3 6h18" />
        <path d="M16 10a4 4 0 0 1-8 0" />
      </>
    ),
  },
  {
    title: "Restaurants & cloud kitchens",
    body: (
      <>
        Weekend menus on Friday morning, plus loyalty balance nudges from{" "}
        <Link
          to="/products/whatsapp-loyalty"
          className="font-medium text-ru-blue-600 underline underline-offset-2 hover:text-ru-blue-700"
        >
          WhatsApp loyalty
        </Link>
        .
      </>
    ),
    tile: "border-ru-blue-200 bg-ru-blue-100 text-ru-blue-700",
    icon: (
      <>
        <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2" />
        <path d="M7 2v20" />
        <path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2Z" />
      </>
    ),
  },
  {
    title: "Clinics & services",
    body: "Health camp and new-service announcements, and a drip that follows up days after a visit.",
    tile: "border-ru-blue-200 bg-ru-blue-100 text-ru-blue-700",
    icon: (
      <>
        <path d="M11 2v2" />
        <path d="M5 2v2" />
        <path d="M5 4v6a7 7 0 0 0 14 0V4" />
        <path d="M8 15v2a4 4 0 0 0 8 0v-1" />
        <circle cx="20" cy="10" r="2" />
      </>
    ),
  },
];

export default function UseCases() {
  return (
    <section className="bg-white">
      <div className={BAND}>
        <SectionHead
          eyebrow="Who broadcasts"
          icon={
            <>
              <circle cx="9" cy="8" r="3.4" />
              <path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.4 3.4 0 0 1 0 7M18 14a6 6 0 0 1 3.5 6" />
            </>
          }
          title="Built for teams that send to thousands, not dozens."
        />
        <div className="grid grid-cols-[repeat(auto-fit,minmax(230px,1fr))] gap-5">
          {USE_CASES.map((useCase) => (
            <div
              key={useCase.title}
              className="flex flex-col gap-3.5 rounded-2xl border border-ru-n-200 bg-ru-n-50 p-6.5"
            >
              <span
                className={`flex size-10 items-center justify-center rounded-lg border ${useCase.tile}`}
              >
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
                  {useCase.icon}
                </svg>
              </span>
              <h3 className="font-display text-[19px] font-bold tracking-[-0.018em] text-ru-n-700">
                {useCase.title}
              </h3>
              <p className="text-[15.5px]/[1.55] text-ru-n-500">{useCase.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
