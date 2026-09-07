import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { CheckIcon } from "@/components/RateupHomePage/shared/home-ui";

/** The three required onboarding steps, then what to do once the number is live. */

interface Step {
  n: string;
  minutes: string;
  title: string;
  body: ReactNode;
  extra: ReactNode;
}

function ClockChip({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <span className="inline-flex h-5 items-center gap-1.25 rounded-4xl border border-ru-n-200 bg-ru-n-50 px-2 text-xs font-medium text-ru-n-500">
      <svg
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </svg>
      {children}
    </span>
  );
}

function Note({ icon, children }: Readonly<{ icon: ReactNode; children: ReactNode }>) {
  return (
    <div className="flex items-center gap-2.25 rounded-md bg-ru-n-50 px-3.25 py-2.75 text-[13px] text-ru-n-500">
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="flex-none text-ru-blue-500"
        aria-hidden="true"
      >
        {icon}
      </svg>
      {children}
    </div>
  );
}

const ASSETS = [
  { label: "WhatsApp accounts · required", required: true },
  { label: "Facebook Pages", required: false },
  { label: "Catalogs", required: false },
  { label: "Instagram accounts", required: false },
  { label: "Ad accounts", required: false },
];

const STEPS: readonly Step[] = [
  {
    n: "1",
    minutes: "3 min",
    title: "Connect WhatsApp Business API",
    body: (
      <>
        Choose <strong className="font-semibold text-ru-n-600">Continue with Facebook</strong> and
        pick the assets to connect. WhatsApp accounts are required; the rest are optional.
      </>
    ),
    extra: (
      <div className="flex flex-wrap gap-1.5">
        {ASSETS.map((asset) => (
          <span
            key={asset.label}
            className={`inline-flex h-5.5 items-center rounded-4xl border px-2.25 text-xs font-medium ${
              asset.required
                ? "border-ru-blue-200 bg-ru-blue-50 text-ru-blue-600"
                : "border-ru-n-200 bg-ru-n-50 text-ru-n-500"
            }`}
          >
            {asset.label}
          </span>
        ))}
      </div>
    ),
  },
  {
    n: "2",
    minutes: "5 min",
    title: "Verify your WhatsApp Business account",
    body: "Complete business verification in Meta Business Manager to unlock higher messaging limits and your verified business name.",
    extra: (
      <Note
        icon={
          <>
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            <path d="M9 12l2 2 4-4" />
          </>
        }
      >
        Higher limits, more sends per day
      </Note>
    ),
  },
  {
    n: "3",
    minutes: "2 min",
    title: "Add payment in Meta",
    body: "Add a payment method to your WhatsApp Business account so template messages can be sent. Meta bills its per-message fee directly.",
    extra: (
      <Note
        icon={
          <>
            <path d="M2 7h20v10a2 2 0 01-2 2H4a2 2 0 01-2-2z" />
            <path d="M2 11h20" />
          </>
        }
      >
        Required before your first template send
      </Note>
    ),
  },
];

const NEXT_STEPS = [
  "Add Instagram and Messenger to the same inbox",
  "Create your first template — an order update is the easiest place to start",
  "Set business hours and auto-replies",
] as const;

export default function Setup() {
  return (
    <section className="border-t border-ru-n-100 bg-background">
      <div className="mx-auto max-w-280 px-5 py-[clamp(3rem,7vw,5.5rem)]">
        <span className="text-[11.5px] font-semibold tracking-[0.1em] text-ru-blue-500 uppercase">
          Setup
        </span>
        <h2 className="mt-3 mb-3.5 font-display text-[clamp(1.625rem,3.6vw,2.25rem)]/[1.12] font-bold tracking-[-0.028em] text-balance text-ru-n-700">
          Three required steps, then you're live
        </h2>
        <p className="mb-9 max-w-[66ch] text-[16.5px]/[1.6] text-ru-n-500">
          Around ten minutes of work, all of it inside Meta's own dialogs. RateUp handles the
          connection behind them.
        </p>

        <ol className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-3">
          {STEPS.map((step) => (
            <li
              key={step.n}
              className="flex flex-col gap-3.5 rounded-xl bg-white p-8 shadow-xs ring-1 ring-ru-n-200 ring-inset"
            >
              <div className="flex items-center justify-between">
                <span className="flex size-9 items-center justify-center rounded-lg bg-ru-blue-600 font-display text-base font-bold text-white">
                  {step.n}
                </span>
                <ClockChip>{step.minutes}</ClockChip>
              </div>
              <h3 className="font-display text-[22px]/[1.25] font-bold tracking-[-0.018em] text-ru-n-700">
                {step.title}
              </h3>
              <p className="text-[14.5px]/[1.55] text-ru-n-500">{step.body}</p>
              {step.extra}
            </li>
          ))}
        </ol>

        <div className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
          <div className="rounded-xl bg-ru-n-50 p-6">
            <span className="text-[11.5px] font-semibold tracking-[0.1em] text-ru-n-400 uppercase">
              Then, when you're ready
            </span>
            <ul className="mt-3.5 grid grid-cols-1 gap-x-5 gap-y-2.5 sm:grid-cols-2">
              {NEXT_STEPS.map((item) => (
                <li key={item} className="flex items-start gap-2.25 text-sm/[1.5] text-ru-n-600">
                  <CheckIcon className="mt-0.75 size-3.75 flex-none text-ru-green-500" />
                  {item}
                </li>
              ))}
              <li className="flex items-start gap-2.25 text-sm/[1.5] text-ru-n-600">
                <CheckIcon className="mt-0.75 size-3.75 flex-none text-ru-green-500" />
                <span>
                  Launch{" "}
                  <Link
                    to="/products/whatsapp-loyalty"
                    className="font-medium text-ru-blue-600 underline underline-offset-2 hover:text-ru-blue-700"
                  >
                    loyalty
                  </Link>{" "}
                  and invite your team
                </span>
              </li>
            </ul>
          </div>

          <div className="flex flex-col justify-center gap-2.5 rounded-xl border border-white/8 bg-ru-blue-900 p-6">
            <span className="inline-flex items-center gap-1.75 text-[11.5px] font-semibold tracking-[0.1em] text-white/60 uppercase">
              <CheckIcon className="size-3.5 text-ru-green-300" />
              Step 3 of 3 complete
            </span>
            <h3 className="font-display text-[22px]/[1.25] font-bold tracking-[-0.018em] text-white">
              You're live. Every reply lands in your inbox.
            </h3>
          </div>
        </div>
      </div>
    </section>
  );
}
