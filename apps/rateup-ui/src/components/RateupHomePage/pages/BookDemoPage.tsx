import { IconArrowLeft, IconBrandWhatsapp, IconCheck } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { Image } from "@unpic/react";
import type { CSSProperties } from "react";
import { useState } from "react";

import { LEGAL_ENTITY } from "@/components/HomePage/pages/Legal/company";
import { MetaLockup, RateupStar } from "@/components/integrations/logos";
import { rateupLogo, rateupLogoWhite } from "@/utils/constants";

import BookDemoForm from "../helpers/BookDemoForm";
import { JOBS, JobTag } from "../shared/capabilities";
import TrustedBy from "../shared/TrustedBy";

/**
 * The sticky header's full height, measured off `BookDemoNav`'s own classes: its tallest
 * child is the 46px WhatsApp pill, and around it sit the pill's and the wrapper's vertical
 * padding. The page pulls itself up by exactly this and adds the same back as padding, so its
 * white ground runs behind the translucent nav pill. Revisit it if the nav's padding or its
 * tallest child changes.
 */
const NAV_HEIGHT = "calc(46px + 2 * clamp(8px, 1.1vw, 12px) + 2 * clamp(8px, 1.3vw, 16px))";

/** Click-to-chat link for the support number, shared by the nav pill and the "in a hurry" card. */
const WHATSAPP_HREF = `https://wa.me/${import.meta.env.VITE_SUPPORT_WHATSAPP}?text=${encodeURIComponent(
  "Hi, I would like to see a RateUp demo",
)}`;

const STEPS = [
  {
    title: "Tell us how you sell",
    body: "Your channels, your store and what you want to fix first.",
  },
  {
    title: "See it live on WhatsApp",
    body: "Real messages from a working setup, sent to your own phone.",
  },
  {
    title: "Leave with a plan",
    body: "Which plan fits, and what it takes to get your team running.",
  },
];

const FAQS = [
  {
    q: "Is the demo free?",
    a: "Yes. There's no charge and no commitment, and you don't need a card.",
  },
  {
    q: "How long does it take?",
    a: "About 20 minutes, plus time for your questions.",
  },
  {
    q: "Who should join?",
    a: "Whoever will answer chats or run campaigns day to day, and whoever decides on tools. Bring both if you can.",
  },
  {
    q: "Can I try RateUp myself first?",
    a: "Yes. The Free plan is free forever and needs no card, so you can explore before or after the demo.",
  },
];

/**
 * Slim chrome for `/book-a-demo`: the page is the site's one conversion surface, so the full
 * marketing nav is replaced by a logo, a way back, and the WhatsApp fast lane.
 */
export function BookDemoNav() {
  return (
    <div className="px-[clamp(10px,2vw,24px)] py-[clamp(8px,1.3vw,16px)]">
      <div className="mx-auto flex max-w-[1200px] flex-nowrap items-center gap-3 rounded-full border border-ru-n-200 bg-white/90 px-[clamp(12px,1.5vw,20px)] py-[clamp(8px,1.1vw,12px)] shadow-[0_2px_10px_rgba(11,31,72,0.05)] backdrop-blur-[16px] backdrop-saturate-150 sm:gap-3.5">
        <Link to="/" className="inline-flex shrink-0" aria-label="RateUp home">
          <Image
            src={rateupLogo}
            alt="RateUp"
            width={126}
            height={50}
            className="h-[clamp(32px,4.6vw,44px)] w-auto"
          />
        </Link>

        <div className="flex-1" />

        <Link
          to="/"
          className="inline-flex h-11 shrink-0 items-center gap-2 rounded-md px-2 text-[15.5px] font-semibold whitespace-nowrap text-ru-n-700 transition-colors hover:text-ru-blue-600 sm:px-4"
        >
          <IconArrowLeft className="size-4" stroke={2.2} />
          {/* Label folds away on narrow screens so the row never overflows. */}
          <span className="hidden sm:inline">Back to home</span>
        </Link>

        <a
          href={WHATSAPP_HREF}
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-[46px] shrink-0 items-center gap-2 rounded-full bg-ru-green-500 px-[clamp(14px,1.7vw,22px)] text-[clamp(14px,1.6vw,15.5px)] font-bold whitespace-nowrap text-white transition-colors hover:bg-ru-green-600"
        >
          <IconBrandWhatsapp className="size-[18px]" />
          WhatsApp
        </a>
      </div>
    </div>
  );
}

/** The matching minimal footer — a navy rule under the page, nothing to click away with. */
export function BookDemoFooter() {
  return (
    <div className="bg-ru-blue-950">
      <div className="mx-auto flex w-full max-w-[1120px] flex-wrap items-center justify-between gap-3.5 px-5 py-[clamp(28px,4vw,40px)]">
        <Image
          src={rateupLogoWhite}
          alt="RateUp"
          width={66}
          height={26}
          className="h-[26px] w-auto"
        />
        <span className="text-[13.5px] text-white/50">
          © {new Date().getFullYear()} {LEGAL_ENTITY} ·{" "}
          <Link
            to="/privacy-policy"
            className="underline-offset-3 hover:text-white hover:underline"
          >
            Privacy
          </Link>{" "}
          ·{" "}
          <Link
            to="/terms-of-service"
            className="underline-offset-3 hover:text-white hover:underline"
          >
            Terms
          </Link>
        </span>
      </div>
    </div>
  );
}

function SentPanel() {
  return (
    <div className="py-[clamp(12px,3vw,26px)] text-center">
      <span className="mb-[18px] inline-flex size-14 items-center justify-center rounded-full border border-ru-green-300 bg-ru-green-50 text-ru-green-600">
        <IconCheck className="size-7" stroke={2.6} />
      </span>
      <div className="mb-2.5 font-display text-[clamp(22px,2.8vw,28px)] font-bold tracking-[-0.028em] text-ru-n-700">
        You&apos;re on the list.
      </div>
      <p className="mx-auto mb-6 max-w-[42ch] text-base leading-[1.6] text-ru-n-500">
        We&apos;ll message you on WhatsApp within one business day with a demo link and a slot that
        suits your timezone.
      </p>
      <div className="flex flex-wrap justify-center gap-2.5">
        <a
          href={WHATSAPP_HREF}
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-[50px] items-center gap-2 rounded-full bg-ru-green-500 px-5 text-base font-semibold text-white transition-colors hover:bg-ru-green-600"
        >
          <IconBrandWhatsapp className="size-[18px]" />
          Message us now
        </a>
        <Link
          to="/"
          className="inline-flex h-[50px] items-center rounded-full border border-ru-n-200 bg-white px-5 text-base font-semibold text-ru-n-700 transition-colors hover:border-ru-n-300"
        >
          Back to home
        </Link>
      </div>
    </div>
  );
}

/** `/book-a-demo` — the single place on the site where a lead is captured. */
export default function BookDemoPage() {
  const [sent, setSent] = useState(false);

  const handleSuccess = () => {
    setSent(true);
    globalThis.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div style={{ "--bd-nav-h": NAV_HEIGHT } as CSSProperties} className="bg-white">
      <section className="-mt-(--bd-nav-h) px-5 pt-[calc(clamp(32px,5vw,64px)+var(--bd-nav-h))] pb-[clamp(40px,6vw,72px)]">
        <div className="mx-auto grid w-full max-w-[1120px] items-start gap-[clamp(32px,5vw,64px)] lg:grid-cols-[1fr_1.02fr]">
          {/* --- the pitch --- */}
          <div className="min-w-0">
            <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-ru-green-300/60 bg-ru-green-50 py-1.5 pr-3.5 pl-2.5 text-[13.5px] font-semibold text-ru-green-700">
              <span className="relative flex size-2">
                <span className="absolute inset-0 animate-ping rounded-full bg-ru-green-500/60 motion-reduce:animate-none" />
                <span className="relative size-2 rounded-full bg-ru-green-500" />
              </span>
              Free 20-minute demo
            </p>

            <h1 className="mb-[18px] font-display text-[clamp(34px,5.2vw,56px)] leading-[1.05] font-bold tracking-[-0.035em] text-balance text-ru-n-700">
              See how RateUp works with <span className="text-[#0F8C4C]">your business.</span>
            </h1>

            <p className="mb-8 max-w-[48ch] text-[clamp(17px,2vw,19px)] leading-[1.6] text-pretty text-ru-n-500">
              A short walkthrough on a live WhatsApp number, shaped around how you sell. You&apos;ll
              see exactly what your customers would get, and what it takes to switch on.
            </p>

            <div className="mb-8 rounded-3xl border border-ru-n-200 p-2">
              <p className="px-3.5 pt-3 pb-2 text-[12.5px] font-semibold tracking-widest text-ru-n-400 uppercase">
                We can cover
              </p>
              <ul className="list-none p-0">
                {JOBS.map((job) => (
                  <li
                    key={job.anchor}
                    className="flex flex-wrap items-center gap-x-3.5 gap-y-1.5 rounded-2xl px-3.5 py-2.5 odd:bg-ru-n-25"
                  >
                    <JobTag anchor={job.anchor} label={job.label} />
                    <span className="text-[15px] text-ru-n-600">{job.title}</span>
                  </li>
                ))}
              </ul>
            </div>

            <p className="mb-4 text-[12.5px] font-semibold tracking-widest text-ru-n-400 uppercase">
              How it works
            </p>
            <ol className="mb-8 flex list-none flex-col gap-4 p-0">
              {STEPS.map((step, i) => (
                <li key={step.title} className="flex gap-3.5">
                  <span className="flex size-[34px] shrink-0 items-center justify-center rounded-full bg-ru-blue-600 font-display text-sm font-bold text-white">
                    {i + 1}
                  </span>
                  <div>
                    <div className="mb-[3px] font-display text-[17px] font-bold tracking-[-0.018em] text-ru-n-700">
                      {step.title}
                    </div>
                    <p className="text-[15.5px] leading-[1.55] text-ru-n-500">{step.body}</p>
                  </div>
                </li>
              ))}
            </ol>

            <div className="flex flex-wrap gap-2.5">
              <span className="inline-flex items-center gap-2 rounded-full border border-ru-n-200 bg-white px-[13px] py-[7px]">
                {/* The lockup already carries the "Meta" wordmark, so the label drops it. */}
                <MetaLockup className="h-2.5" />
                <span className="text-[13.5px] font-medium text-ru-n-600">Business Partner</span>
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-ru-n-200 bg-white px-[13px] py-[7px]">
                <RateupStar className="size-4" />
                <span className="text-[13.5px] font-medium text-ru-n-600">
                  100+ brands · 10+ countries
                </span>
              </span>
            </div>
          </div>

          {/* --- the form --- */}
          <div className="min-w-0 lg:sticky lg:top-[clamp(88px,11vw,124px)]">
            <div className="rounded-[28px] border border-ru-n-200 bg-white p-[clamp(20px,3.5vw,36px)] shadow-[0_30px_70px_-20px_rgba(11,31,72,0.18)]">
              {sent ? (
                <SentPanel />
              ) : (
                <>
                  <div className="mb-1.5 font-display text-[clamp(21px,2.6vw,26px)] font-bold tracking-[-0.025em] text-ru-n-700">
                    Book your demo
                  </div>
                  <p className="text-[15px] text-ru-n-500">
                    We&apos;ll reply on WhatsApp within one business day.
                  </p>

                  <BookDemoForm
                    idPrefix="book-a-demo-page"
                    className="mt-6"
                    onSuccess={handleSuccess}
                  />
                </>
              )}
            </div>

            <a
              href={WHATSAPP_HREF}
              target="_blank"
              rel="noreferrer"
              className="group mt-4 flex items-center gap-3.5 rounded-2xl border border-ru-n-200 bg-ru-n-25 px-5 py-4 transition-colors hover:border-ru-green-300 hover:bg-ru-green-50"
            >
              <span className="flex size-10 flex-none items-center justify-center rounded-xl bg-ru-green-500 text-white">
                <IconBrandWhatsapp className="size-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-display text-[16px] font-bold text-ru-n-700">
                  In a hurry?
                </span>
                <span className="block text-[14px] text-ru-n-500">
                  Message us on WhatsApp and we&apos;ll answer in minutes.
                </span>
              </span>
              <span className="text-[14.5px] font-semibold whitespace-nowrap text-ru-green-700 transition-transform group-hover:translate-x-0.5">
                Chat →
              </span>
            </a>
          </div>
        </div>
      </section>

      <div className="border-t border-ru-n-100">
        <TrustedBy />
      </div>

      <section className="border-t border-ru-n-100 px-5 py-[clamp(40px,6vw,72px)]">
        <div className="mx-auto max-w-[1120px]">
          <h2 className="mb-7 text-center font-display text-[clamp(1.5rem,3vw,2rem)] font-bold tracking-[-0.025em] text-ru-n-700">
            Questions before you book
          </h2>
          <dl className="grid gap-3.5 sm:grid-cols-2">
            {FAQS.map((faq) => (
              <div key={faq.q} className="rounded-2xl border border-ru-n-200 p-5.5">
                <dt className="mb-1.5 font-display text-[17px] font-bold text-ru-n-700">{faq.q}</dt>
                <dd className="text-[15px]/[1.6] text-ru-n-500">{faq.a}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>
    </div>
  );
}
