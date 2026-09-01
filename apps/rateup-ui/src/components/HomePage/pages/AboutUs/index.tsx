import {
  IconBulb,
  IconEye,
  IconHeartHandshake,
  IconShieldCheck,
  IconUsersGroup,
} from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { RateupStar } from "@/components/integrations/logos";
import { BOOK_DEMO_ROUTE } from "@/components/RateupHomePage/helper/BookDemoLink.tsx";
import {
  ArrowRight,
  BookDemoCta,
  Eyebrow,
  useReveal,
  WhatsAppCta,
  WhatsAppTile,
  WHATSAPP_HREF,
} from "@/components/RateupHomePage/shared/home-ui.tsx";

/**
 * `/about-us`, drawn to the marketing design system.
 *
 * Same bands, spacing and `ru-*` palette the homepage sections use, so the page reads as
 * part of the site rather than a leftover. The values used to be a flat PNG; they are real
 * cards here, which keeps them legible on a phone and searchable — the copy matches
 * `src/markdown/about-us.ts`, which is what crawlers are served.
 */

interface Value {
  icon: ReactNode;
  title: string;
  body: string;
}

const VALUES: Value[] = [
  {
    icon: <IconBulb className="size-4.75" stroke={1.8} />,
    title: "Innovation",
    body: "We keep shipping. The latest of what technology makes possible should reach a ten-person shop, not only an enterprise.",
  },
  {
    icon: <IconHeartHandshake className="size-4.75" stroke={1.8} />,
    title: "Customer-Centricity",
    body: "Our customers sit at the centre of every roadmap call. We build what their customers actually feel, not what demos well.",
  },
  {
    icon: <IconShieldCheck className="size-4.75" stroke={1.8} />,
    title: "Integrity",
    body: "Honest pricing, honest numbers, honest answers — including when the answer is that we are not the right fit.",
  },
  {
    icon: <IconEye className="size-4.75" stroke={1.8} />,
    title: "Transparency",
    body: "Open communication with customers, partners and our own team. Nothing important lives in a private thread.",
  },
];

export default function AboutUs() {
  const [valuesRef, valuesShown] = useReveal<HTMLDivElement>(0.2);

  return (
    <main className="bg-white">
      {/* --- who we are --- */}
      <section className="border-b border-ru-n-100 bg-[linear-gradient(180deg,#f1f6fc_0%,#fbfcfe_62%,#ffffff_100%)]">
        <div className="mx-auto max-w-280 px-5 py-14 sm:py-26">
          <div className="mx-auto max-w-190 text-center">
            <Eyebrow className="mb-4.5" icon={<RateupStar className="size-4.5" />}>
              About us
            </Eyebrow>
            <h1 className="mb-4.5 font-display text-[clamp(2.25rem,5.6vw,3.75rem)]/[1.05] font-bold tracking-[-0.035em] text-balance text-ru-n-700">
              We&apos;re RateUp.
            </h1>
            <p className="mx-auto mb-7 max-w-[54ch] text-[clamp(1.0625rem,2.1vw,1.28125rem)]/[1.6] text-pretty text-ru-n-500 sm:mb-9">
              An AI-powered customer engagement platform for the messages that come after the sale —
              the feedback, the fix, the reward, the second order. All of it on the channels your
              customers already use.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <BookDemoCta className="max-sm:w-full max-sm:justify-center" />
              <WhatsAppCta className="max-sm:w-full max-sm:justify-center" />
            </div>
          </div>
        </div>
      </section>

      {/* --- mission + what we do --- */}
      <section className="border-b border-ru-n-100 bg-white">
        <div className="mx-auto max-w-280 px-5 py-14 sm:py-26">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-3 rounded-2xl border border-ru-n-200 bg-ru-n-50 p-6.5 sm:p-8">
              <span className="flex size-9.5 items-center justify-center rounded-[10px] border border-ru-n-200 bg-white text-ru-blue-600">
                <IconUsersGroup className="size-4.75" stroke={1.8} />
              </span>
              <h2 className="font-display text-[clamp(1.375rem,2.8vw,1.75rem)] font-bold tracking-[-0.025em] text-ru-n-700">
                Our mission
              </h2>
              <p className="text-[16.5px]/[1.6] text-pretty text-ru-n-500">
                To empower businesses of all sizes with the insights they need to create
                exceptional, unforgettable{" "}
                <span className="font-semibold text-ru-blue-600">customer experiences</span> —
                whether they ship ten orders a week or ten thousand.
              </p>
            </div>

            <div className="flex flex-col gap-3 rounded-2xl border border-ru-n-200 bg-ru-n-50 p-6.5 sm:p-8">
              <span className="flex size-9.5 items-center justify-center rounded-[10px] border border-ru-n-200 bg-white text-ru-blue-600">
                <RateupStar className="size-5" />
              </span>
              <h2 className="font-display text-[clamp(1.375rem,2.8vw,1.75rem)] font-bold tracking-[-0.025em] text-ru-n-700">
                Empowering businesses
              </h2>
              <p className="text-[16.5px]/[1.6] text-pretty text-ru-n-500">
                Through data, insights and automation we help you lift{" "}
                <span className="font-semibold text-ru-blue-600">customer satisfaction</span> at
                every touchpoint — from the first reply to the fifth repeat order.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* --- values --- */}
      <section className="border-b border-ru-n-100 bg-ru-n-50">
        <div className="mx-auto max-w-280 px-5 py-14 sm:py-26">
          <div className="mb-8 max-w-170 sm:mb-12">
            <Eyebrow className="mb-4.5" icon={<IconShieldCheck className="size-4" stroke={1.9} />}>
              The RateUp commitment
            </Eyebrow>
            <h2 className="mb-4 font-display text-[clamp(2rem,5vw,3.25rem)]/[1.08] font-bold tracking-[-0.03em] text-balance text-ru-n-700">
              Four values that decide the close calls.
            </h2>
            <p className="text-[clamp(1.0625rem,2vw,1.25rem)]/[1.6] text-pretty text-ru-n-500">
              Every product decision runs through these. They are why we say no to some features and
              ship others in a week.
            </p>
          </div>

          <div ref={valuesRef} className="flex flex-wrap gap-4">
            {VALUES.map((value, i) => (
              <div
                key={value.title}
                style={{ animationDelay: `${i * 110}ms` }}
                className={`flex flex-[1_1_250px] flex-col gap-3 rounded-2xl border border-ru-n-200 bg-white p-6.5 transition-all hover:-translate-y-0.5 hover:border-ru-n-300 hover:shadow-md motion-reduce:animate-none ${
                  valuesShown ? "animate-ru-rise" : "opacity-0"
                }`}
              >
                <span className="flex size-9.5 items-center justify-center rounded-[10px] border border-ru-n-200 bg-ru-n-50 text-ru-blue-600">
                  {value.icon}
                </span>
                <div className="font-display text-[19px] font-bold tracking-[-0.018em] text-ru-n-700">
                  {value.title}
                </div>
                <p className="text-[15.5px]/[1.55] text-ru-n-500">{value.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* --- closing --- */}
      <section className="relative overflow-hidden bg-ru-blue-950">
        <div className="absolute top-[-14%] left-1/2 aspect-2/1 w-[min(1000px,120%)] -translate-x-1/2 bg-[radial-gradient(ellipse_at_center,rgba(90,140,198,0.2)_0%,transparent_62%)]" />

        <div className="relative mx-auto max-w-280 px-5 py-14 sm:py-26">
          <div className="mx-auto max-w-190 text-center">
            <h2 className="mb-4.5 font-display text-[clamp(2.125rem,5.4vw,3.75rem)]/[1.05] font-bold tracking-[-0.035em] text-balance text-white">
              Let&apos;s build unforgettable experiences together.
            </h2>
            <p className="mx-auto mb-7 max-w-[52ch] text-[clamp(1.0625rem,2.1vw,1.28125rem)]/[1.6] text-pretty text-white/68 sm:mb-9">
              Twenty minutes is enough to see RateUp running on your own catalogue — and to work out
              what the loop is worth to you per month.
            </p>

            <div className="flex flex-wrap justify-center gap-3">
              <Link
                to={BOOK_DEMO_ROUTE}
                className="inline-flex h-13.5 items-center gap-2.5 rounded-lg bg-white px-7 text-[17px] font-semibold text-ru-blue-700 transition-transform hover:-translate-y-px hover:text-ru-blue-800 max-sm:w-full max-sm:justify-center"
              >
                Book a Demo
                <ArrowRight />
              </Link>
              <a
                href={WHATSAPP_HREF}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-13.5 items-center gap-2.5 rounded-lg border border-white/22 bg-white/6 px-5.5 text-[17px] font-semibold text-white transition-colors hover:bg-white/12 max-sm:w-full max-sm:justify-center"
              >
                <WhatsAppTile />
                Chat with us on WhatsApp
              </a>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
