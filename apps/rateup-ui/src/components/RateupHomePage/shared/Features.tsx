import type { ReactNode } from "react";

import {
  BookDemoCta,
  CheckIcon,
  CountUp,
  Eyebrow,
  useReveal,
  WhatsAppCta,
  WhatsAppTile,
} from "./home-ui";

/** The bento's default tile: icon, title, copy, then an optional visual pinned to the bottom. */
function Card({
  icon,
  title,
  body,
  children,
  className = "",
}: Readonly<{
  icon: ReactNode;
  title: ReactNode;
  body: string;
  children?: ReactNode;
  className?: string;
}>) {
  return (
    <div
      className={`flex flex-col gap-3.5 rounded-[20px] border border-ru-n-200 bg-white p-5.5 transition-all hover:border-ru-n-300 hover:shadow-md sm:p-7 ${className}`}
    >
      <span className="flex size-9.5 items-center justify-center rounded-[10px] border border-ru-blue-200 bg-ru-blue-50 text-ru-blue-600">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="size-4.75"
          aria-hidden="true"
        >
          {icon}
        </svg>
      </span>
      <div>
        <div className="mb-1.5 font-display text-[19.5px] font-bold tracking-[-0.02em] text-ru-n-700">
          {title}
        </div>
        <p className="text-[15.5px]/[1.55] text-ru-n-500">{body}</p>
      </div>
      {children}
    </div>
  );
}

/** A small inset panel — the sample UI each tile shows off. */
function Inset({
  children,
  className = "",
}: Readonly<{ children: ReactNode; className?: string }>) {
  return (
    <div className={`mt-auto rounded-xl border border-ru-n-200 bg-ru-n-50 p-3.5 ${className}`}>
      {children}
    </div>
  );
}

function Avatar({
  initials,
  className = "bg-ru-blue-600",
  size = "size-6.5 text-[11.5px]",
}: Readonly<{ initials: string; className?: string; size?: string }>) {
  return (
    <span
      className={`flex flex-none items-center justify-center rounded-full font-semibold text-white ${size} ${className}`}
    >
      {initials}
    </span>
  );
}

const INBOX_THREADS = [
  {
    initials: "RK",
    tone: "bg-ru-blue-600",
    name: "Rohan K.",
    at: "2m",
    preview: "Change my delivery address?",
    active: true,
  },
  {
    initials: "MN",
    tone: "bg-ru-green-600",
    name: "Meera N.",
    at: "14m",
    preview: "Redeeming 240 points, thanks",
  },
  {
    initials: "FA",
    tone: "bg-ru-blue-400",
    name: "Fatima A.",
    at: "1h",
    preview: "Do you ship to Dubai?",
  },
];

const AUTOMATION_STEPS = [
  { label: "Order delivered", dot: "bg-ru-green-500" },
  { label: "Wait 2 days", dot: "bg-ru-n-400" },
  { label: "Ask for a rating", dot: "bg-ru-blue-600", active: true },
];

const RATING_BARS = [
  "h-[38%] bg-ru-blue-200",
  "h-[52%] bg-ru-blue-300",
  "h-[44%] bg-ru-blue-200",
  "h-[68%] bg-ru-blue-400",
  "h-[82%] bg-ru-blue-500",
  "h-full bg-ru-blue-600",
];

/* Everything below reveals once, when its own tile scrolls into view. The stagger is what
   makes each one read as data arriving rather than as a card sliding in — bars grow left to
   right, the thread replies in order, the flow builds top-down. */

/** The loyalty thread, replying one bubble at a time. */
function LoyaltyThread() {
  const [ref, shown] = useReveal<HTMLDivElement>(0.25);

  const bubble = `transition-[opacity,transform] duration-500 ease-out ${
    shown ? "translate-y-0 opacity-100" : "translate-y-1.5 opacity-0"
  }`;

  const delay = (index: number) => ({ transitionDelay: `${index * 260}ms` });

  return (
    <div
      ref={ref}
      className="flex flex-col gap-2.25 rounded-2xl border border-ru-n-200 bg-ru-n-50 p-4"
    >
      <div
        style={delay(0)}
        className={`max-w-[88%] self-start rounded-[16px_16px_16px_4px] border border-ru-n-200 bg-white px-3.25 py-2.5 text-[14.5px]/[1.5] text-ru-n-600 ${bubble}`}
      >
        Order #4821 delivered. You've earned{" "}
        <strong className="font-semibold text-ru-amber-700">120 points</strong> — ₹120 off your next
        order.
        <div className="mt-2.5 flex gap-2">
          <span className="flex-1 rounded-lg border border-ru-blue-200 p-2 text-center text-[13.5px] font-semibold text-ru-blue-600">
            Redeem now
          </span>
          <span className="flex-1 rounded-lg border border-ru-n-200 p-2 text-center text-[13.5px] font-medium text-ru-n-500">
            My points
          </span>
        </div>
      </div>
      <div
        style={delay(1)}
        className={`max-w-[80%] self-end rounded-[16px_16px_4px_16px] bg-ru-blue-600 px-3.25 py-2.5 text-[14.5px]/[1.5] text-white ${bubble}`}
      >
        Redeem now
      </div>
      <div
        style={delay(2)}
        className={`max-w-[88%] self-start rounded-[16px_16px_16px_4px] border border-ru-n-200 bg-white px-3.25 py-2.5 text-[14.5px]/[1.5] text-ru-n-600 ${bubble}`}
      >
        Done. Code <strong className="font-semibold text-ru-n-700">RATEUP120</strong> is live at
        checkout for 7 days.
      </div>
    </div>
  );
}

/** Churn meter: the fill sweeps out from the left while the score counts to it. */
function ChurnMeter() {
  const [ref, shown] = useReveal<HTMLSpanElement>();

  return (
    <div className="mb-1.5 flex items-center gap-2.5">
      <span className="flex-none text-[12.5px] text-ru-n-500">Churn risk</span>
      <span ref={ref} className="h-1.75 flex-1 overflow-hidden rounded-full bg-ru-n-100">
        {/* scaleX rather than width: it stays on the compositor, so the sweep does not force
            a layout pass on every frame. */}
        <span
          className={`block h-full w-[68%] origin-left bg-ru-amber-600 transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] ${
            shown ? "scale-x-100" : "scale-x-0"
          }`}
        />
      </span>
      <span className="flex-none text-[12.5px] font-semibold text-ru-n-600">
        <CountUp value="68" durationMs={900} />
      </span>
    </div>
  );
}

/** The ratings histogram. Bars grow from the baseline, left to right. */
function RatingChart() {
  const [ref, shown] = useReveal<HTMLDivElement>(0.4);

  return (
    <div ref={ref} className="flex h-19.5 items-end gap-2">
      {RATING_BARS.map((bar, i) => (
        <span
          key={i}
          style={{ transitionDelay: `${i * 90}ms` }}
          className={`flex-1 origin-bottom rounded-t-[5px] transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] ${bar} ${
            shown ? "scale-y-100" : "scale-y-0"
          }`}
        />
      ))}
    </div>
  );
}

/** The automation flow, drawing itself in running order. */
function AutomationFlow() {
  const [ref, shown] = useReveal<HTMLDivElement>();

  return (
    <div ref={ref} className="mt-auto flex flex-col gap-1.75">
      {AUTOMATION_STEPS.map((s, i) => (
        <div
          key={s.label}
          style={{ transitionDelay: `${i * 200}ms` }}
          className={`flex items-center gap-2.25 rounded-lg border px-2.75 py-2.25 text-[13.5px] transition-[opacity,transform] duration-500 ease-out ${
            s.active
              ? "border-ru-blue-200 bg-ru-blue-50 font-medium text-ru-blue-600"
              : "border-ru-n-200 bg-ru-n-50 text-ru-n-600"
          } ${shown ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0"}`}
        >
          <span className={`size-1.5 flex-none rounded-full ${s.dot}`} />
          {s.label}
        </div>
      ))}
    </div>
  );
}

export default function Features() {
  return (
    <section id="platform" className="border-b border-ru-n-100 bg-ru-n-50">
      <div className="mx-auto max-w-280 px-5 py-14 sm:py-26">
        <div className="mb-7 flex flex-wrap items-end justify-between gap-6 sm:mb-10">
          <div className="max-w-155">
            <Eyebrow
              className="mb-4.5"
              icon={
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="size-4"
                  aria-hidden="true"
                >
                  <rect x="3" y="3" width="7.5" height="7.5" rx="2" />
                  <rect x="13.5" y="3" width="7.5" height="7.5" rx="2" />
                  <rect x="3" y="13.5" width="7.5" height="7.5" rx="2" />
                  <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="2" />
                </svg>
              }
            >
              The platform
            </Eyebrow>
            <h2 className="mb-4 font-display text-[clamp(2rem,5vw,3.25rem)]/[1.08] font-bold tracking-[-0.03em] text-balance text-ru-n-700">
              Everything you need in one place.
            </h2>
            <p className="text-[clamp(1.0625rem,2vw,1.25rem)]/[1.6] text-pretty text-ru-n-500">
              Ten modules, one customer record. Start with loyalty on WhatsApp — the rest is already
              switched on.
            </p>
          </div>
          <div className="inline-flex items-center gap-2.25 rounded-full border border-ru-n-200 bg-white px-3.5 py-2">
            <span className="size-2 rounded-full bg-ru-green-500" />
            <span className="text-sm font-medium text-ru-n-600">No per-module pricing</span>
          </div>
        </div>

        {/* Row A — the flagship, plus the inbox */}
        <div className="mb-4 flex flex-wrap gap-4">
          <div className="flex flex-[2.1_1_420px] flex-col gap-4 rounded-[20px] border border-ru-blue-200 bg-white p-5.5 shadow-md sm:p-7.5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="inline-flex items-center gap-1.75 rounded-full border border-ru-amber-200 bg-ru-amber-50 py-1.25 pr-2.75 pl-1.25 text-[13px] font-semibold text-ru-amber-700">
                <span className="size-4 rounded-full bg-ru-star" />
                Flagship
              </span>
              <span className="inline-flex items-center gap-1.75 text-[13.5px] text-ru-n-500">
                <WhatsAppTile className="size-4.5 rounded-[5px]" glyphClassName="size-2.75" />
                Runs on your own number
              </span>
            </div>

            <div>
              <div className="mb-2 font-display text-[clamp(1.375rem,2.9vw,1.8125rem)] font-bold tracking-[-0.025em] text-ru-n-700">
                WhatsApp Loyalty
              </div>
              <p className="max-w-[52ch] text-base/[1.6] text-ru-n-500">
                Points, tiers, referrals and redemptions inside the thread. Your customer replies to
                a message — no app, no card, no login, no landing page.
              </p>
            </div>

            <LoyaltyThread />

            <div className="mt-auto flex flex-wrap gap-2.5">
              {[
                "Points per order or per rupee",
                "Referral links that track",
                "Tiers & expiry rules",
              ].map((chip) => (
                <span
                  key={chip}
                  className="inline-flex items-center rounded-full border border-ru-n-200 bg-ru-n-50 px-2.75 py-1.5 text-[13.5px] text-ru-n-600"
                >
                  {chip}
                </span>
              ))}
            </div>
          </div>

          <Card
            className="flex-[1.2_1_300px]"
            icon={<path d="M3 6h18M3 12h18M3 18h12" />}
            title="Omnichannel Inbox"
            body="WhatsApp, Instagram and Messenger in one shared queue. Assign, tag, resolve."
          >
            <Inset className="flex flex-col gap-0.5 p-2.5">
              {INBOX_THREADS.map((t) => (
                <div
                  key={t.initials}
                  className={`flex gap-2.5 rounded-lg px-2.5 py-2.25 ${t.active ? "bg-ru-blue-50" : ""}`}
                >
                  <Avatar initials={t.initials} className={t.tone} />
                  <div className="min-w-0 flex-1">
                    <div className="flex justify-between gap-2">
                      <span className="text-[13.5px] font-medium text-ru-n-700">{t.name}</span>
                      <span className="text-[11.5px] text-ru-n-400">{t.at}</span>
                    </div>
                    <div className="truncate text-[12.5px] text-ru-n-500">{t.preview}</div>
                  </div>
                </div>
              ))}
            </Inset>
          </Card>
        </div>

        {/* Row B */}
        <div className="mb-4 flex flex-wrap gap-4">
          <Card
            className="flex-[1.6_1_320px]"
            icon={
              <>
                <circle cx="12" cy="8" r="3.4" />
                <path d="M5 20a7 7 0 0 1 14 0" />
              </>
            }
            title={<>Customer Profiles &amp; Retention&nbsp;AI</>}
            body="Every order, rating and reply on one timeline — with a churn score that tells you who to message today."
          >
            <Inset>
              <div className="mb-3 flex items-center gap-2.5">
                <Avatar initials="MN" size="size-8 text-[13px]" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-ru-n-700">Meera N. · 6 orders</div>
                  <div className="text-[12.5px] text-ru-n-400">Last order 34 days ago</div>
                </div>
                <span className="flex-none rounded-full border border-ru-amber-200 bg-ru-amber-50 px-2.25 py-1 text-[12.5px] font-semibold text-ru-amber-700">
                  At risk
                </span>
              </div>
              <ChurnMeter />
              <div className="text-[12.5px] text-ru-n-400">
                Suggested: win-back with 240 unused points
              </div>
            </Inset>
          </Card>

          <Card
            className="flex-[1_1_240px]"
            icon={<path d="M13 2 3 14h8l-1 8 10-12h-8Z" />}
            title="Smart Automations"
            body="Trigger, wait, branch, send. Built in an afternoon, running forever."
          >
            <AutomationFlow />
          </Card>

          <Card
            className="flex-[1_1_240px]"
            icon={
              <>
                <path d="M3 11v2a1 1 0 0 0 1 1h2l4 4V6L6 10H4a1 1 0 0 0-1 1Z" />
                <path d="M15 9a4 4 0 0 1 0 6" />
              </>
            }
            title="Campaigns"
            body="Segment by spend, city or last order, then send an approved template in minutes."
          >
            <Inset>
              <div className="mb-1.5 text-[12.5px] text-ru-n-500">Repeat buyers · Kerala</div>
              <div className="font-display text-[26px]/none font-bold tracking-[-0.03em] text-ru-n-700">
                <CountUp value="12,480" />
              </div>
              <div className="mt-2 flex items-center gap-1.5 text-[12.5px] text-ru-green-600">
                <CheckIcon className="size-3" />
                Template approved
              </div>
            </Inset>
          </Card>
        </div>

        {/* Row C */}
        <div className="mb-4 flex flex-wrap gap-4">
          <Card
            className="flex-[1.5_1_300px]"
            icon={<path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />}
            title="Feedback & Analytics"
            body="Ratings, NPS and reasons — by product, branch and agent. Sentiment you can act on the same day."
          >
            <Inset className="p-4">
              <RatingChart />
              <div className="mt-3 flex items-baseline justify-between">
                <span className="text-[12.5px] text-ru-n-400">Avg. rating, last 6 weeks</span>
                <span className="font-display text-[17px] font-bold text-ru-n-700">
                  <CountUp value="4.8" durationMs={900} />
                </span>
              </div>
            </Inset>
          </Card>

          <Card
            className="flex-[1_1_240px]"
            icon={
              <>
                <rect x="4" y="7" width="16" height="12" rx="3" />
                <path d="M12 3v4M9 13h.01M15 13h.01" />
              </>
            }
            title="AI Chatbots"
            body="Answers order, refund and stock questions in your brand's voice, then hands off cleanly."
          >
            <Inset className="flex flex-col gap-2 p-3">
              <span className="max-w-[88%] self-end rounded-[14px_14px_4px_14px] bg-ru-blue-600 px-2.75 py-2 text-[13.5px] text-white">
                Where's my order?
              </span>
              <span className="max-w-[92%] self-start rounded-[14px_14px_14px_4px] border border-ru-n-200 bg-white px-2.75 py-2 text-[13.5px] text-ru-n-600">
                Out for delivery — arriving by 6pm today.
              </span>
            </Inset>
          </Card>

          <Card
            className="flex-[1_1_240px]"
            icon={
              <>
                <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" />
                <path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />
              </>
            }
            title="CRM Integrations"
            body="Two-way sync with your store, POS and CRM. One customer record, everywhere."
          >
            <div className="mt-auto flex flex-wrap gap-2">
              {["Shopify", "Zoho", "Petpooja"].map((name) => (
                <span
                  key={name}
                  className="rounded-lg border border-ru-n-200 bg-ru-n-50 px-2.75 py-1.5 text-[13px] text-ru-n-600"
                >
                  {name}
                </span>
              ))}
            </div>
          </Card>
        </div>

        {/* Row D */}
        <div className="flex flex-wrap gap-4">
          <Card
            className="flex-[1_1_240px]"
            icon={
              <>
                <rect x="6.5" y="2.5" width="11" height="19" rx="3" />
                <path d="M11 18.5h2" />
              </>
            }
            title="Mobile Apps"
            body="Reply, approve and check today's numbers from the shop floor. iOS and Android."
          />

          <Card
            className="flex-[1_1_240px]"
            icon={
              <>
                <circle cx="9" cy="8" r="3.2" />
                <path d="M3 20a6 6 0 0 1 12 0" />
                <path d="M16 5.2a3.2 3.2 0 0 1 0 6.1M18 20a5.6 5.6 0 0 0-2.4-4.6" />
              </>
            }
            title="Teams & Roles"
            body="Branch-level access, agent limits and audit trails. Unlimited seats."
          >
            <div className="mt-auto flex items-center">
              <Avatar
                initials="AM"
                size="size-8 text-[13px]"
                className="border-2 border-white bg-ru-blue-600"
              />
              <Avatar
                initials="RK"
                size="size-8 text-[13px]"
                className="-ml-2.25 border-2 border-white bg-ru-blue-400"
              />
              <Avatar
                initials="SN"
                size="size-8 text-[13px]"
                className="-ml-2.25 border-2 border-white bg-ru-green-600"
              />
              <span className="-ml-2.25 flex size-8 flex-none items-center justify-center rounded-full border-2 border-white bg-ru-n-100 text-[12.5px] font-semibold text-ru-n-500">
                +9
              </span>
            </div>
          </Card>

          <div className="flex flex-[1.2_1_260px] flex-col justify-between gap-3.5 rounded-[20px] border border-ru-blue-200 bg-ru-blue-50 p-5.5 sm:p-7">
            <div>
              <div className="mb-2 font-display text-[clamp(1.25rem,2.4vw,1.4375rem)] font-bold tracking-[-0.022em] text-ru-n-700">
                Want it wired to your own store?
              </div>
              <p className="text-[15.5px]/[1.55] text-ru-n-600">
                We'll set up loyalty, feedback and one win-back flow on a demo number in 20 minutes.
              </p>
            </div>
            <div className="flex flex-wrap gap-2.5">
              <BookDemoCta
                showArrow={false}
                className="h-11.5 px-5 text-[15.5px] max-sm:w-full max-sm:justify-center"
              />
              <WhatsAppCta className="h-11.5 px-4 text-[15.5px] max-sm:w-full max-sm:justify-center">
                WhatsApp
              </WhatsAppCta>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
