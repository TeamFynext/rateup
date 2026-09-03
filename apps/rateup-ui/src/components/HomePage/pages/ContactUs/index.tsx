import { IconCalendarEvent, IconMail, IconMapPin } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { BOOK_DEMO_ROUTE } from "@/components/RateupHomePage/helper/BookDemoLink.tsx";
import {
  ArrowRight,
  ClosingCta,
  Eyebrow,
  HERO_UNDER_NAV,
  HERO_WASH,
  useReveal,
  WhatsAppGlyph,
  WHATSAPP_HREF,
} from "@/components/RateupHomePage/shared/home-ui.tsx";

/**
 * `/contact-us`, drawn to the marketing design system.
 *
 * Ordered by how quickly we actually answer: WhatsApp first, then email, then a demo slot.
 * The two office cards stay at the bottom — they are the legal detail, not the fast lane.
 */

const SUPPORT_EMAIL = "hello@rateup.app";

interface Channel {
  icon: ReactNode;
  /** Tile colour behind the icon — WhatsApp keeps its brand green, the rest are brand blue. */
  tone: string;
  title: string;
  body: string;
  actionLabel: string;
  href?: string;
  to?: string;
}

const CHANNELS: Channel[] = [
  {
    icon: <WhatsAppGlyph className="size-4.75" />,
    tone: "bg-ru-green-50 border-ru-green-100 text-ru-green-600",
    title: "WhatsApp",
    body: "The fastest way to reach us — and the same channel your customers would be on. Usually answered within minutes during business hours.",
    actionLabel: "Chat with us",
    href: WHATSAPP_HREF,
  },
  {
    icon: <IconMail className="size-4.75" stroke={1.8} />,
    tone: "bg-ru-blue-50 border-ru-blue-100 text-ru-blue-600",
    title: "Email",
    body: `Sales, support, partnerships or press — ${SUPPORT_EMAIL} reaches the whole team. We reply within one business day.`,
    actionLabel: SUPPORT_EMAIL,
    href: `mailto:${SUPPORT_EMAIL}`,
  },
  {
    icon: <IconCalendarEvent className="size-4.75" stroke={1.8} />,
    tone: "bg-ru-amber-50 border-ru-amber-100 text-ru-amber-700",
    title: "Book a demo",
    body: "Twenty minutes on your own catalogue, with the messages sent to your own phone. Bring your numbers and we'll size the loop together.",
    actionLabel: "Pick a slot",
    to: BOOK_DEMO_ROUTE,
  },
];

interface Office {
  country: string;
  entity: string;
  lines: string[];
}

const OFFICES: Office[] = [
  {
    country: "India",
    entity: "Uprate Technologies Private Limited",
    lines: ["Kerala Startup Mission", "Cochin, Kerala"],
  },
  {
    country: "Germany",
    entity: "RateUp",
    lines: ["Duesseldorf, Germany"],
  },
];

const ACTION_LINK =
  "mt-auto inline-flex w-fit items-center gap-2 text-[15px] font-semibold text-ru-blue-600 transition-colors hover:text-ru-blue-700";

export default function ContactUs() {
  const [cardsRef, shown] = useReveal<HTMLDivElement>(0.2);

  return (
    <main className="bg-white">
      {/* --- how to reach us --- */}
      <section className={`${HERO_WASH} ${HERO_UNDER_NAV}`}>
        <div className="mx-auto max-w-280 px-5 pb-14 sm:pb-26">
          <div className="mx-auto mb-8 max-w-190 text-center sm:mb-12">
            <Eyebrow className="mb-4.5" icon={<IconMail className="size-4" stroke={1.9} />}>
              Contact us
            </Eyebrow>
            <h1 className="mb-4.5 font-display text-[clamp(2.25rem,5.6vw,3.75rem)]/[1.05] font-bold tracking-[-0.035em] text-balance text-ru-n-700">
              Talk to a person, not a ticket queue.
            </h1>
            <p className="mx-auto max-w-[54ch] text-[clamp(1.0625rem,2.1vw,1.28125rem)]/[1.6] text-pretty text-ru-n-500">
              Pick whichever suits you. Whatever you send lands with the same small team that builds
              RateUp.
            </p>
          </div>

          <div ref={cardsRef} className="flex flex-wrap gap-4">
            {CHANNELS.map((channel, i) => (
              <div
                key={channel.title}
                style={{ animationDelay: `${i * 110}ms` }}
                className={`flex flex-[1_1_280px] flex-col gap-3 rounded-2xl border border-ru-n-200 bg-white p-6.5 transition-all hover:-translate-y-0.5 hover:border-ru-n-300 hover:shadow-md motion-reduce:animate-none ${
                  shown ? "animate-ru-rise" : "opacity-0"
                }`}
              >
                <span
                  className={`flex size-9.5 items-center justify-center rounded-[10px] border ${channel.tone}`}
                >
                  {channel.icon}
                </span>
                <div className="font-display text-[19px] font-bold tracking-[-0.018em] text-ru-n-700">
                  {channel.title}
                </div>
                <p className="mb-1 text-[15.5px]/[1.55] text-ru-n-500">{channel.body}</p>
                {channel.to ? (
                  <Link to={channel.to} className={ACTION_LINK}>
                    {channel.actionLabel}
                    <ArrowRight className="size-3.5" />
                  </Link>
                ) : (
                  <a
                    href={channel.href}
                    target={channel.href?.startsWith("http") ? "_blank" : undefined}
                    rel="noreferrer"
                    className={`${ACTION_LINK} break-all`}
                  >
                    {channel.actionLabel}
                    <ArrowRight className="size-3.5 flex-none" />
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* --- offices --- */}
      <section className="border-b border-ru-n-100 bg-ru-n-50">
        <div className="mx-auto max-w-280 px-5 py-14 sm:py-26">
          <div className="mb-8 max-w-170">
            <h2 className="mb-4 font-display text-[clamp(2rem,5vw,3.25rem)]/[1.08] font-bold tracking-[-0.03em] text-balance text-ru-n-700">
              Where we are.
            </h2>
            <p className="text-[clamp(1.0625rem,2vw,1.25rem)]/[1.6] text-pretty text-ru-n-500">
              Two offices, one team — split across timezones so somebody is usually awake when you
              write.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {OFFICES.map((office) => (
              <div
                key={office.country}
                className="flex flex-col gap-3 rounded-2xl border border-ru-n-200 bg-white p-6.5 sm:p-8"
              >
                <span className="flex size-9.5 items-center justify-center rounded-[10px] border border-ru-n-200 bg-ru-n-50 text-ru-blue-600">
                  <IconMapPin className="size-4.75" stroke={1.8} />
                </span>
                <div className="font-display text-[clamp(1.375rem,2.8vw,1.75rem)] font-bold tracking-[-0.025em] text-ru-n-700">
                  {office.country}
                </div>
                <address className="text-[15.5px]/[1.6] text-ru-n-500 not-italic">
                  <span className="font-semibold text-ru-n-600">{office.entity}</span>
                  {office.lines.map((line) => (
                    <span key={line} className="block">
                      {line}
                    </span>
                  ))}
                </address>
                <a
                  href={`mailto:${SUPPORT_EMAIL}`}
                  className={`${ACTION_LINK} break-all`}
                  aria-label={`Email our ${office.country} office`}
                >
                  {SUPPORT_EMAIL}
                  <ArrowRight className="size-3.5 flex-none" />
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* --- closing --- */}
      <ClosingCta
        eyebrow="Answered by the people who build RateUp"
        title="Would rather just see it working?"
      >
        Twenty minutes, your catalogue, our demo number — or send the question straight to WhatsApp
        and skip the calendar.
      </ClosingCta>
    </main>
  );
}
