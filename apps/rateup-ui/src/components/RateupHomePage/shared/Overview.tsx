import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { MetaLockup } from "@/components/integrations/logos";

import { type Capability, type Job, JOBS, JobTag } from "./capabilities";
import { ArrowRight, StarLabel, useReveal } from "./home-ui";

function NewBadge() {
  return (
    <span className="rounded-md bg-ru-star-cta px-1.75 py-1 font-display text-[10.5px]/none font-bold tracking-[0.05em] text-ru-blue-900 uppercase">
      New
    </span>
  );
}

function Bubble({
  out = false,
  time,
  className = "",
  children,
}: Readonly<{ out?: boolean; time?: string; className?: string; children: ReactNode }>) {
  return (
    <div
      className={`max-w-[86%] rounded-[14px] px-3 pt-2.25 pb-1.75 text-[14px]/[1.35] font-medium text-ru-n-700 shadow-[0_1px_1px_rgba(0,0,0,0.07)] ${
        out ? "self-end rounded-tr-[4px] bg-[#d9fdd3]" : "self-start rounded-tl-[4px] bg-white"
      } ${className}`}
    >
      {children}
      {time && <span className="mt-0.5 block text-right text-[10.5px] text-ru-n-400">{time}</span>}
    </div>
  );
}

function PaidChip() {
  return (
    <span className="inline-flex items-center rounded-full bg-[#dcf7e5] px-2.5 py-1.5 text-[12.5px]/none font-semibold whitespace-nowrap text-[#11803a]">
      ✓ Paid · $46.00
    </span>
  );
}

/* Each job's picture: the moment from the homepage film that sums it up, drawn small. */
function SupportScene() {
  return (
    <>
      <span className="absolute top-5 left-5 inline-flex items-center gap-2 rounded-[14px] bg-white py-2 pr-3 pl-2 text-[13px] font-semibold text-ru-n-600 shadow-[0_12px_28px_-12px_rgba(15,37,64,0.35)]">
        <kbd className="rounded-md bg-ru-blue-50 px-1.75 py-0.75 font-display text-[14px] font-extrabold text-ru-blue-600">
          /
        </kbd>
        ship · Saved reply
      </span>
      <Bubble time="11:41">Hi! Do you ship to Canada?</Bubble>
      <Bubble out time="11:41 ✓✓">
        Yes, in 3–5 days. Free over $40!
      </Bubble>
    </>
  );
}

function SellScene() {
  return (
    <>
      <div className="w-[86%] self-end rounded-[14px] rounded-tr-[4px] bg-[#d9fdd3] p-1.5 shadow-[0_1px_1px_rgba(0,0,0,0.07)]">
        <div className="flex items-center gap-2.5 rounded-xl bg-white p-2">
          <span className="relative h-11.5 w-10 flex-none rounded-lg bg-[linear-gradient(160deg,#f6e3c6,#e7c595)] after:absolute after:inset-[15px_7px_7px] after:rounded-[5px] after:bg-[#2d4a3e]" />
          <span className="text-[12.5px] font-semibold text-ru-n-500">
            <b className="block font-display text-[14px] font-bold text-ru-n-700">
              Morning Ridge Blend
            </b>
            Whole bean · $18.00
          </span>
        </div>
        <div className="mt-1.5 rounded-[9px] bg-white py-2 text-center text-[13px] font-bold text-[#027eb5]">
          Checkout
        </div>
      </div>
      <Bubble className="flex items-center gap-2.5">
        Payment received
        <PaidChip />
      </Bubble>
    </>
  );
}

function BackScene() {
  return (
    <>
      <div className="absolute inset-x-5 top-5 rounded-[14px] bg-white px-3.5 py-3 shadow-[0_12px_28px_-12px_rgba(15,37,64,0.35)]">
        <div className="flex items-center justify-between font-display text-[14px] font-bold text-ru-n-700">
          Cold brew week
          <span className="rounded-full bg-amber-50 px-2 py-0.75 text-[11.5px] font-semibold text-amber-700">
            Sent
          </span>
        </div>
        <div className="mt-2.25 flex justify-between text-[12px] font-semibold text-ru-n-500">
          Read
          <b className="text-ru-n-700">903 of 1,158</b>
        </div>
        <div className="mt-1.25 h-1.75 overflow-hidden rounded-full bg-ru-n-100">
          <div className="h-full w-[78%] rounded-full bg-ru-blue-500" />
        </div>
      </div>
      <Bubble className="flex max-w-[92%] items-center gap-2.5">
        <span className="flex size-8.5 flex-none items-center justify-center rounded-[10px] bg-[linear-gradient(135deg,var(--color-ru-star-top),#f8a21d)]">
          <svg viewBox="0 0 24 24" className="size-4.5 fill-white" aria-hidden="true">
            <path d="M12 2.5l2.9 6 6.6.8-4.9 4.6 1.3 6.5L12 17.2l-5.9 3.2 1.3-6.5L2.5 9.3l6.6-.8z" />
          </svg>
        </span>
        <span className="text-[12.5px] text-ru-n-500">
          <b className="block font-display text-[14px] font-bold text-ru-n-700">
            +52 points, Emily!
          </b>
          You're 90 points from Platinum
        </span>
      </Bubble>
    </>
  );
}

/* Blue, amber and green, after the three products that lead each job: inbox, shop, loyalty. */
const SCENES = [
  {
    scene: <SupportScene />,
    tint: "bg-[radial-gradient(260px_200px_at_80%_0%,rgba(90,140,198,0.28),transparent_70%),linear-gradient(160deg,var(--color-ru-blue-50),#e8f0fa)]",
  },
  {
    scene: <SellScene />,
    tint: "bg-[radial-gradient(260px_200px_at_80%_0%,rgba(255,213,76,0.35),transparent_70%),linear-gradient(160deg,#fff8e9,#fdf1d8)]",
  },
  {
    scene: <BackScene />,
    tint: "bg-[radial-gradient(260px_200px_at_80%_0%,rgba(37,211,102,0.22),transparent_70%),linear-gradient(160deg,#eefbf3,#e2f6ea)]",
  },
];

function CapabilityLink({ capability }: Readonly<{ capability: Capability }>) {
  const content = (
    <>
      <span className="flex size-8.5 flex-none items-center justify-center rounded-[10px] border border-ru-blue-100 bg-ru-blue-50 text-ru-blue-600 transition-colors group-hover:border-ru-blue-600 group-hover:bg-ru-blue-600 group-hover:text-white">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="size-4.25"
          aria-hidden="true"
        >
          {capability.icon}
        </svg>
      </span>
      <span className="min-w-0">
        <span className="flex items-center gap-2 font-display text-[16px]/[1.25] font-bold tracking-[-0.01em] text-ru-n-700">
          {capability.label}
          {capability.isNew && <NewBadge />}
        </span>
        <span className="mt-0.75 block text-[13.5px]/[1.45] text-ru-n-500">{capability.body}</span>
      </span>
      {capability.to && (
        <ArrowRight className="ml-auto size-4 flex-none -translate-x-1 self-center text-ru-blue-600 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100 motion-reduce:transition-none max-sm:hidden" />
      )}
    </>
  );
  const className =
    "group flex items-start gap-3 rounded-[14px] p-3 transition-colors hover:bg-ru-n-50";

  return capability.to ? (
    <Link to={capability.to} className={className}>
      {content}
    </Link>
  ) : (
    <div className={className}>{content}</div>
  );
}

function JobCard({ job, index }: Readonly<{ job: Job; index: number }>) {
  const { scene, tint } = SCENES[index];

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-[28px] border border-ru-n-200 bg-white transition-all duration-300 hover:-translate-y-0.75 hover:border-ru-blue-300 hover:shadow-[0_24px_50px_-24px_rgba(15,37,64,0.3)] motion-reduce:transition-none">
      <div
        aria-hidden="true"
        className={`relative flex h-52.5 flex-col justify-end gap-2 overflow-hidden p-5 sm:h-59 ${tint}`}
      >
        {scene}
      </div>

      <div className="px-6.5 pt-6 pb-2.5">
        <JobTag anchor={job.anchor} label={job.label}>
          {job.isNew && <NewBadge />}
        </JobTag>
        <h3 className="mt-4 mb-2 font-display text-[clamp(1.375rem,2.4vw,1.625rem)]/[1.15] font-bold tracking-[-0.02em] text-ru-n-700">
          {job.title}
        </h3>
        <p className="text-[15.5px]/[1.55] text-ru-n-500">{job.body}</p>
        <a
          href={`#${job.anchor}`}
          className="mt-2.5 inline-flex items-center gap-1 text-[14px] font-semibold text-ru-blue-600 underline-offset-4 hover:underline"
        >
          See how it works
          <span aria-hidden="true">↓</span>
        </a>
      </div>

      <ul className="mt-auto list-none px-3.5 pt-2 pb-4">
        {job.capabilities.map((capability) => (
          <li key={capability.label}>
            <CapabilityLink capability={capability} />
          </li>
        ))}
      </ul>
    </article>
  );
}

function TrustChip({ icon, children }: Readonly<{ icon: ReactNode; children: ReactNode }>) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-ru-n-200 bg-white px-3.25 py-1.75">
      {icon}
      <span className="text-[13.5px] font-medium text-ru-n-600">{children}</span>
    </span>
  );
}

export default function Overview() {
  const [gridRef, shown] = useReveal<HTMLUListElement>(0.12);

  return (
    /* The band rides up over the hero's navy as a rounded sheet. A gradient fade between the
       two goes muddy halfway: navy into cream passes through grey-brown. */
    <section className="relative -mt-8 rounded-t-4xl bg-ru-n-25 px-5 pt-12 pb-10 sm:-mt-10 sm:rounded-t-[2.5rem] sm:pt-16 sm:pb-14">
      <div className="mx-auto max-w-280">
        <div className="mx-auto mb-9 max-w-190 text-center sm:mb-13">
          <StarLabel>What RateUp does</StarLabel>
          <h2 className="mb-4 font-display text-[clamp(2rem,5vw,3.25rem)]/[1.08] font-bold tracking-[-0.03em] text-balance text-ru-n-700">
            Everything your customers need, in the chat{" "}
            <span className="text-[#0F8C4C]">they already use.</span>
          </h2>
          <p className="text-[clamp(1.0625rem,2vw,1.25rem)]/[1.6] text-pretty text-ru-n-500">
            Support, sell and bring them back on WhatsApp, Instagram and Messenger. No new apps for
            your customers.
          </p>
        </div>

        <ul
          ref={gridRef}
          className="mx-auto mb-8 grid max-w-xl list-none gap-4 p-0 sm:mb-10 lg:max-w-none lg:grid-cols-3 lg:gap-5"
        >
          {JOBS.map((job, i) => (
            <li
              key={job.label}
              style={{ animationDelay: `${i * 90}ms` }}
              className={`motion-reduce:animate-none ${shown ? "animate-ru-rise" : "opacity-0"}`}
            >
              <JobCard job={job} index={i} />
            </li>
          ))}
        </ul>

        <div className="flex flex-wrap items-center justify-center gap-2.5">
          {/* The lockup carries the "Meta" wordmark, so the chip's own label drops it. */}
          <TrustChip icon={<MetaLockup className="h-2.5" />}>Business Partner</TrustChip>
          <TrustChip
            icon={
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="size-3.75 text-ru-n-500"
                aria-hidden="true"
              >
                <path d="M4 8h16l-1.4 11a2 2 0 0 1-2 1.8H7.4a2 2 0 0 1-2-1.8L4 8Z" />
                <path d="M9 8V6a3 3 0 0 1 6 0v2" />
              </svg>
            }
          >
            Works with Shopify &amp; WooCommerce
          </TrustChip>
        </div>
      </div>
    </section>
  );
}
