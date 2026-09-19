import { IconArrowLeft, IconBrandWhatsapp, IconCheck } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { Image } from "@unpic/react";
import type { CSSProperties } from "react";
import { useState } from "react";

import { MetaLockup, RateupStar } from "@/components/integrations/logos";
import { rateupLogo, rateupLogoWhite } from "@/utils/constants";

import BookDemoForm from "../helpers/BookDemoForm";

/**
 * The sticky header's full height, measured off `BookDemoNav`'s own classes: its tallest
 * child is the 46px WhatsApp pill, and around it sit the pill's and the wrapper's vertical
 * padding. The page band pulls itself up by exactly this and adds the same back as padding,
 * so the warm wash runs to the top of the page and reads behind the translucent nav pill.
 *
 * Both halves read the one value, so they cannot drift. Revisit it if the nav's padding or
 * its tallest child changes — anything short of the real height leaves a strip of page
 * ground showing above the wash.
 */
const NAV_HEIGHT = "calc(46px + 2 * clamp(8px, 1.1vw, 12px) + 2 * clamp(8px, 1.3vw, 16px))";

/** Click-to-chat link for the support number, shared by the nav pill and the "in a hurry" card. */
const WHATSAPP_HREF = `https://wa.me/${import.meta.env.VITE_SUPPORT_WHATSAPP}?text=${encodeURIComponent(
  "Hi, I would like to see a RateUp demo",
)}`;

/** What the twenty minutes actually contain — the design leads with this, not with feature bullets. */
const STEPS = [
  {
    title: "We load your catalogue",
    body: "Shopify, WooCommerce or a CSV — takes about four minutes.",
  },
  {
    title: "You get the messages on WhatsApp",
    body: "Feedback request, points credit and a win-back — sent to your own phone.",
  },
  {
    title: "We size the numbers together",
    body: "Your order volume, your repeat rate, what the loop is worth per month.",
  },
];

/**
 * Slim chrome for `/book-a-demo`: the page is the site's one conversion surface, so the full
 * marketing nav is replaced by a logo, a way back, and the WhatsApp fast lane.
 */
export function BookDemoNav() {
  return (
    <div className="px-[clamp(10px,2vw,24px)] py-[clamp(8px,1.3vw,16px)]">
      <div className="mx-auto flex max-w-[1200px] flex-nowrap items-center gap-3 rounded-full border border-border bg-card/90 px-[clamp(12px,1.5vw,20px)] py-[clamp(8px,1.1vw,12px)] shadow-[0_2px_10px_rgba(11,31,72,0.05)] backdrop-blur-[16px] backdrop-saturate-150 sm:gap-3.5">
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
          className="inline-flex h-11 shrink-0 items-center gap-2 rounded-md px-2 text-[15.5px] font-semibold whitespace-nowrap text-foreground transition-colors hover:text-primary sm:px-4"
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
          © {new Date().getFullYear()} RateUp · www.rateup.app
        </span>
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

  /* The design's warm wash: cream at the top settling into #fcfcfd — the same value as the
     `ink-25` canvas — so the section dissolves into the site ground instead of ending on an edge.
     The negative top margin runs it up under the sticky nav, whose pill is translucent over a
     blur and paints no ground of its own; the padding-top adds that height back, leaving the
     design's clamp(40px,6vw,72px) of air above the eyebrow. See `NAV_HEIGHT`. */
  return (
    <div
      style={{ "--bd-nav-h": NAV_HEIGHT } as CSSProperties}
      className="-mt-(--bd-nav-h) border-b border-b-[#f1eadd] bg-[linear-gradient(180deg,#fffaf0_0%,#fefcf8_55%,#fcfcfd_100%)] px-5 pt-[calc(clamp(40px,6vw,72px)+var(--bd-nav-h))] pb-[clamp(48px,7vw,88px)]"
    >
      <div className="mx-auto grid w-full max-w-[1120px] items-start gap-[clamp(32px,5vw,64px)] lg:grid-cols-2">
        {/* --- the pitch --- */}
        <div className="min-w-0">
          <div className="mb-4 text-[12.5px] font-semibold tracking-[0.1em] text-ru-blue-500 uppercase">
            Book a demo
          </div>

          <h1 className="mb-[18px] font-display text-[clamp(34px,5.4vw,58px)] leading-[1.05] font-bold tracking-[-0.035em] text-balance text-foreground">
            See RateUp running on your own catalogue.
          </h1>

          <p className="mb-8 max-w-[48ch] text-[clamp(17px,2vw,20px)] leading-[1.6] text-pretty text-muted-foreground">
            Twenty minutes, your products, our demo number. You&apos;ll leave knowing exactly what
            your customers would receive after their next order.
          </p>

          <ol className="mb-8 flex list-none flex-col gap-4 p-0">
            {STEPS.map((step, i) => (
              <li key={step.title} className="flex gap-3.5">
                <span className="flex size-[34px] shrink-0 items-center justify-center rounded-full border border-ru-blue-200 bg-ru-blue-50 font-display text-sm font-bold text-primary">
                  {i + 1}
                </span>
                <div>
                  <div className="mb-[3px] font-display text-[17.5px] font-bold tracking-[-0.018em] text-foreground">
                    {step.title}
                  </div>
                  <p className="text-[15.5px] leading-[1.55] text-muted-foreground">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>

          <div className="mb-7 flex flex-wrap gap-2.5">
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-[13px] py-[7px]">
              {/* The lockup already carries the "Meta" wordmark, so the label drops it. */}
              <MetaLockup className="h-2.5" />
              <span className="text-[13.5px] font-medium text-secondary-foreground">
                Business Partner
              </span>
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-[13px] py-[7px]">
              <RateupStar className="size-4" />
              <span className="text-[13.5px] font-medium text-secondary-foreground">
                100+ brands · 30+ countries
              </span>
            </span>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3.5 rounded-2xl border border-border bg-card p-5">
            <div className="min-w-0">
              <div className="font-display text-[17px] font-bold tracking-[-0.02em] text-foreground">
                In a hurry?
              </div>
              <div className="mt-[3px] text-[14.5px] text-muted-foreground">
                Message us and we&apos;ll answer in minutes.
              </div>
            </div>
            <a
              href={WHATSAPP_HREF}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-12 shrink-0 items-center gap-2.5 rounded-md border border-border bg-card px-[18px] text-base font-semibold text-foreground shadow-xs transition-colors hover:border-ru-n-300"
            >
              <span className="inline-flex size-[22px] shrink-0 items-center justify-center rounded-[6px] bg-ru-green-500">
                <IconBrandWhatsapp className="size-3.5 text-white" />
              </span>
              Chat with us on WhatsApp
            </a>
          </div>
        </div>

        {/* --- the form --- */}
        <div className="min-w-0 lg:sticky lg:top-[clamp(88px,11vw,124px)]">
          <div className="rounded-3xl border border-border bg-card p-[clamp(20px,3.5vw,36px)] shadow-[0_24px_60px_rgba(11,31,72,0.1)]">
            {sent ? (
              <div className="py-[clamp(12px,3vw,26px)] text-center">
                <span className="mb-[18px] inline-flex size-14 items-center justify-center rounded-full border border-ru-green-300 bg-ru-green-50 text-ru-green-600">
                  <IconCheck className="size-7" stroke={2.6} />
                </span>
                <div className="mb-2.5 font-display text-[clamp(22px,2.8vw,28px)] font-bold tracking-[-0.028em] text-foreground">
                  You&apos;re on the list.
                </div>
                <p className="mx-auto mb-6 max-w-[42ch] text-base leading-[1.6] text-muted-foreground">
                  We&apos;ll message you on WhatsApp within one business day with a demo link and a
                  slot that suits your timezone.
                </p>
                <div className="flex flex-wrap justify-center gap-2.5">
                  <a
                    href={WHATSAPP_HREF}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-[50px] items-center gap-2 rounded-md bg-ru-green-500 px-5 text-base font-semibold text-white transition-colors hover:bg-ru-green-600"
                  >
                    <IconBrandWhatsapp className="size-[18px]" />
                    Message us now
                  </a>
                  <Link
                    to="/"
                    className="inline-flex h-[50px] items-center rounded-md border border-border bg-card px-5 text-base font-semibold text-foreground shadow-xs transition-colors hover:border-ru-n-300"
                  >
                    Back to home
                  </Link>
                </div>
              </div>
            ) : (
              <>
                <div className="mb-1.5 font-display text-[clamp(21px,2.6vw,26px)] font-bold tracking-[-0.025em] text-foreground">
                  Tell us where to reach you
                </div>
                <p className="text-[15px] text-muted-foreground">
                  We reply on WhatsApp within one business day.
                </p>

                <BookDemoForm
                  idPrefix="book-a-demo-page"
                  className="mt-6"
                  onSuccess={handleSuccess}
                />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
