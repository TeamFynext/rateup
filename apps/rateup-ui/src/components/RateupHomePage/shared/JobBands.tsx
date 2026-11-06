import { Link, type LinkProps } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { PhoneMockupCard } from "@/components/ui/phone-mockup";

import { type JobAnchor, JobTag } from "./capabilities";
import { ArrowRight, StarLabel, useReveal } from "./home-ui";

/* Each job keeps the accent the overview cards give it: blue, amber, green. */
const TONES = {
  support: {
    num: "bg-ru-blue-50 text-ru-blue-600",
    pain: "border-ru-blue-200 bg-ru-blue-50/60",
    painLabel: "text-ru-blue-700",
  },
  sell: {
    num: "bg-ru-amber-100 text-ru-amber-700",
    pain: "border-ru-amber-200 bg-ru-amber-50",
    painLabel: "text-ru-amber-700",
  },
  back: {
    num: "bg-ru-green-50 text-ru-green-600",
    pain: "border-ru-green-300/60 bg-ru-green-50/70",
    painLabel: "text-ru-green-700",
  },
} as const;

interface Band {
  id: JobAnchor;
  tone: keyof typeof TONES;
  label: string;
  isNew?: boolean;
  pain: string;
  title: string;
  lede: string;
  points: readonly { title: string; body: string }[];
  cta: { label: string; to: LinkProps["to"] };
  note?: { label: string; to: LinkProps["to"] };
  scene: ReactNode;
}

function Phone({
  name,
  initials,
  channel,
  avatar,
  x,
  children,
}: Readonly<{
  name: string;
  initials: string;
  channel: string;
  avatar: string;
  /** `left-*` for the phone's centre, set clear of the scene's floating cards. */
  x: string;
  children: ReactNode;
}>) {
  return (
    <PhoneMockupCard
      variant="gray"
      className={`absolute top-8 w-75 -translate-x-1/2 ${x} drop-shadow-[0_40px_40px_rgba(0,0,0,0.55)] max-sm:top-5 max-sm:origin-top max-sm:scale-[0.8]`}
      screenClassName="bg-[#efe7dd] bg-[radial-gradient(rgba(120,95,60,0.07)_1.2px,transparent_1.3px)] bg-size-[18px_18px]"
    >
      <div className="relative h-full overflow-hidden">
        <div className="flex h-23 items-center gap-2.5 bg-white px-4 pt-11">
          <span
            className={`flex size-9 flex-none items-center justify-center rounded-full font-display text-[13px] font-extrabold text-white ${avatar}`}
          >
            {initials}
          </span>
          <span>
            <b className="block font-display text-[15px]/tight font-bold text-ru-n-700">{name}</b>
            <span className="text-[11.5px] font-medium text-[#0f8c4c]">{channel}</span>
          </span>
        </div>
        <div className="flex flex-col gap-2 px-3 py-3.5">{children}</div>
      </div>
    </PhoneMockupCard>
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
      className={`max-w-[86%] rounded-[14px] px-3 pt-2.25 pb-1.75 text-[13.5px]/[1.35] font-medium text-ru-n-700 shadow-[0_1px_1px_rgba(0,0,0,0.07)] ${
        out ? "self-end rounded-tr-[4px] bg-[#d9fdd3]" : "self-start rounded-tl-[4px] bg-white"
      } ${className}`}
    >
      {children}
      {time && <span className="mt-0.5 block text-right text-[10.5px] text-ru-n-400">{time}</span>}
    </div>
  );
}

/** A card floating over the scene, outside the phone. Positioned by the caller. */
function Float({ className, children }: Readonly<{ className: string; children: ReactNode }>) {
  return (
    <div
      className={`absolute z-10 rounded-[18px] bg-white shadow-[0_0_0_1px_rgba(255,255,255,0.5),0_30px_60px_-20px_rgba(0,0,0,0.7)] ${className}`}
    >
      {children}
    </div>
  );
}

function SupportScene() {
  return (
    <>
      <Phone
        name="Liam Foster"
        initials="LF"
        channel="Messenger"
        avatar="bg-[linear-gradient(135deg,#4f7cf0,#6a5ae0)]"
        x="left-[62%]"
      >
        <Bubble time="10:12">Hi! Do you ship to Canada?</Bubble>
        <Bubble out time="10:12 ✓✓">
          Yes, in 3–5 days. Free over $40!
        </Bubble>
        <Bubble time="10:13">Great, I'd like to order then.</Bubble>
        <div className="self-center rounded-lg bg-white/80 px-2.5 py-1 text-[11px] font-semibold text-ru-n-500">
          Assigned to Nina · Orders team
        </div>
      </Phone>
      <Float className="bottom-10 left-5 w-52 p-2.5 max-sm:bottom-6 max-sm:left-3 max-sm:w-44">
        <div className="px-1.5 pb-1.5 text-[11px] font-bold tracking-[0.08em] text-ru-n-400 uppercase">
          Inbox
        </div>
        {[
          ["Liam Foster", "Messenger", "bg-[#0a7cff]"],
          ["Olivia Bennett", "WhatsApp", "bg-wa-green"],
          ["Ethan Park", "Instagram", "bg-[linear-gradient(45deg,#fa7e1e,#d62976,#962fbf)]"],
        ].map(([name, channel, dot], i) => (
          <div
            key={name}
            className={`flex items-center gap-2 rounded-[10px] px-2 py-1.75 ${i === 0 ? "bg-ru-blue-50" : ""}`}
          >
            <span className={`size-2.5 flex-none rounded-full ${dot}`} />
            <span className="min-w-0 text-[13px] font-semibold text-ru-n-700">
              {name}
              <span className="block text-[11px] font-medium text-ru-n-500">{channel}</span>
            </span>
          </div>
        ))}
      </Float>
      <Float className="top-28 right-5 flex items-center gap-2.5 px-3.5 py-3 max-sm:top-20 max-sm:right-3">
        <kbd className="rounded-md bg-ru-blue-50 px-2 py-1 font-display text-[15px] font-extrabold text-ru-blue-600">
          /
        </kbd>
        <span className="text-[13px] font-semibold text-ru-n-600">
          ship
          <span className="block text-[11.5px] font-medium text-ru-n-400">Saved reply</span>
        </span>
      </Float>
    </>
  );
}

function SellScene() {
  return (
    <>
      <Phone
        name="Olivia Bennett"
        initials="OB"
        channel="WhatsApp"
        avatar="bg-[linear-gradient(135deg,#d9467a,#f07b4f)]"
        x="left-[38%]"
      >
        <Bubble time="11:42">Can I get the gift box with some coffee? 🎁</Bubble>
        <div className="w-[86%] self-end rounded-[14px] rounded-tr-[4px] bg-[#d9fdd3] p-1.5 shadow-[0_1px_1px_rgba(0,0,0,0.07)]">
          <div className="rounded-[10px] bg-white p-2.25">
            <b className="font-display text-[13.5px] font-bold text-ru-n-700">
              Your order · 2 items
            </b>
            <span className="block text-[12px] font-semibold text-ru-n-500">
              Gift box + Morning Ridge · $46.00
            </span>
          </div>
          <div className="mt-1.5 rounded-[9px] bg-white py-2 text-center text-[13px] font-bold text-[#027eb5]">
            Checkout
          </div>
        </div>
        <Bubble time="11:47">✅ Payment received. Order #1038 is confirmed!</Bubble>
      </Phone>
      <Float className="top-24 right-5 w-52 px-4 py-3.5 max-sm:top-16 max-sm:right-3 max-sm:w-42">
        <div className="flex items-center justify-between font-display text-[14.5px] font-bold text-ru-n-700">
          Order #1038
          <span className="rounded-full bg-ru-green-50 px-2 py-0.75 text-[11px] font-semibold text-ru-green-600">
            ● Paid
          </span>
        </div>
        <div className="mt-2 mb-1.5 font-display text-[28px]/none font-extrabold tracking-[-0.02em] text-ru-blue-900 max-sm:text-[22px]">
          $46.00
        </div>
        <div className="text-[12.5px] font-semibold text-ru-n-500">Olivia Bennett · 2 items</div>
      </Float>
      <Float className="bottom-8 left-5 w-56 p-2 max-sm:bottom-5 max-sm:left-3 max-sm:w-48">
        <div className="px-2.5 pt-1 pb-1.5 text-[11px] font-bold tracking-[0.08em] text-ru-n-400 uppercase">
          Sell
        </div>
        <div className="rounded-[10px] bg-ru-amber-50 px-2.5 py-2.25 text-[13.5px] font-semibold text-ru-amber-700">
          🛍️ Send products
        </div>
        <div className="px-2.5 py-2.25 text-[13.5px] font-semibold text-ru-n-600">
          🧾 Create order / payment link
        </div>
      </Float>
    </>
  );
}

function BackScene() {
  return (
    <>
      <Phone
        name="Fern & Field Coffee"
        initials="FF"
        channel="WhatsApp"
        avatar="bg-[linear-gradient(135deg,#8a5a2b,#c98b4a)]"
        x="left-[62%]"
      >
        <Bubble time="15:02">Thanks for visiting, Emily! How was your coffee today?</Bubble>
        <div className="flex gap-1.5 self-start">
          {["😞", "😐", "🙂", "😀", "🤩"].map((face, i) => (
            <span
              key={face}
              className={`flex size-9 items-center justify-center rounded-[10px] bg-white text-[18px] shadow-[0_1px_1px_rgba(0,0,0,0.08)] ${i === 4 ? "ring-2 ring-ru-green-500" : ""}`}
            >
              {face}
            </span>
          ))}
        </div>
        <Bubble time="15:03">
          <b>+52 points</b> for today's visit. You're 58 points from Platinum! ⭐
        </Bubble>
      </Phone>
      <Float className="bottom-10 left-5 w-56 px-4 py-3.5 max-sm:hidden">
        <div className="flex items-center justify-between font-display text-[14px] font-bold text-ru-n-700">
          Cold brew week
          <span className="rounded-full bg-ru-amber-50 px-2 py-0.75 text-[11px] font-semibold text-ru-amber-700">
            Sent
          </span>
        </div>
        {[
          ["Delivered", "1,158", "w-[98%] bg-ru-blue-500"],
          ["Read", "903", "w-[76%] bg-ru-blue-400"],
          ["Replied", "141", "w-[12%] bg-ru-amber-500"],
        ].map(([label, value, bar]) => (
          <div key={label} className="mt-2.5">
            <div className="flex justify-between text-[12px] font-semibold text-ru-n-500">
              {label}
              <b className="text-ru-n-700">{value}</b>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-ru-n-100">
              <div className={`h-full rounded-full ${bar}`} />
            </div>
          </div>
        ))}
      </Float>
      <Float className="right-5 bottom-10 w-52 overflow-hidden p-0 max-sm:right-3 max-sm:bottom-6 max-sm:w-40">
        <div className="bg-[linear-gradient(135deg,#b8862a,#e8b54a_55%,#c9952f)] px-4 py-3.5 text-white">
          <div className="text-[10.5px] font-bold tracking-[0.1em] uppercase opacity-85">
            Fern &amp; Field Rewards
          </div>
          <div className="mt-1.5 font-display text-[24px]/none font-extrabold">3,942 pts</div>
          <div className="mt-1 text-[12px] font-semibold opacity-90">Emily · Gold member</div>
        </div>
      </Float>
    </>
  );
}

const BANDS: readonly Band[] = [
  {
    id: "support",
    tone: "support",
    label: "Support",
    pain: "chats pile up across three apps, and customers wait hours for an answer.",
    title: "Answer every chat in seconds.",
    lede: "WhatsApp, Instagram and Messenger in one inbox your whole team shares.",
    points: [
      {
        title: "One inbox for every channel",
        body: "Assign chats, mention a teammate, tag and resolve.",
      },
      {
        title: "Saved replies and flows",
        body: "Type a slash for a saved answer, or let a no-code flow reply.",
      },
      {
        title: "An AI agent when you're away",
        body: "Meta's AI agent answers from your own knowledge base and hands over to your team.",
      },
    ],
    cta: { label: "Explore the Shared Inbox", to: "/products/omnichannel-inbox" },
    scene: <SupportScene />,
  },
  {
    id: "sell",
    tone: "sell",
    label: "Sell",
    isNew: true,
    pain: "customers ask about a product in the chat, then leave to look for your website. Many never come back.",
    title: "Take orders right in the chat.",
    lede: "Send products, build the cart and get paid through a payment link, all in WhatsApp, Instagram or Messenger.",
    points: [
      {
        title: "Send products from your catalog",
        body: "Product cards with photos and prices, straight from the composer.",
      },
      {
        title: "Build the cart, share a checkout link",
        body: "Create the order for them and send one link to pay.",
      },
      {
        title: "Paid orders land in Orders",
        body: "The customer gets a confirmation, and your team sees it marked paid.",
      },
    ],
    cta: { label: "Explore Shop & Checkout", to: "/products/social-commerce" },
    note: { label: "The Free plan includes 50 orders a month", to: "/pricing" },
    scene: <SellScene />,
  },
  {
    id: "bring-them-back",
    tone: "back",
    label: "Bring them back",
    pain: "most customers buy once and never hear from you again.",
    title: "Turn buyers into regulars.",
    lede: "Rewards, feedback and campaigns, in the chat they already opened.",
    points: [
      {
        title: "Loyalty on WhatsApp",
        body: "Points, VIP tiers and rewards, with a QR member card and a cashier screen.",
      },
      {
        title: "Feedback after every visit",
        body: "Happy customers go on to Google reviews. Unhappy ones reach your team first.",
      },
      {
        title: "Campaigns that get read",
        body: "Schedule broadcasts to customers who opted in, and see who read and replied.",
      },
    ],
    cta: { label: "Explore Loyalty", to: "/products/whatsapp-loyalty" },
    scene: <BackScene />,
  },
];

function JobBand({ band, index }: Readonly<{ band: Band; index: number }>) {
  const tone = TONES[band.tone];
  const [ref, shown] = useReveal<HTMLDivElement>(0.2);
  const flipped = index % 2 === 1;

  return (
    <section
      id={band.id}
      className={`scroll-mt-24 bg-white px-5 pb-12 sm:pb-16 ${index === 0 ? "pt-10 sm:pt-14" : "border-t border-ru-n-100 pt-12 sm:pt-16"}`}
    >
      <div
        ref={ref}
        className="mx-auto grid max-w-280 items-center gap-9 lg:grid-cols-[1fr_1.1fr] lg:gap-16"
      >
        <div
          className={`motion-reduce:animate-none ${shown ? "animate-ru-rise" : "opacity-0"} ${flipped ? "lg:order-2" : ""}`}
        >
          <JobTag anchor={band.id} label={band.label} size="lg">
            {band.isNew && (
              <span className="rounded-md bg-ru-star-cta px-1.75 py-1 font-display text-[10.5px]/none font-bold tracking-[0.05em] text-ru-blue-900">
                New
              </span>
            )}
          </JobTag>
          <p
            className={`mt-5.5 max-w-115 rounded-[14px] border border-dashed px-4 py-3 text-[15px]/[1.45] text-ru-n-600 ${tone.pain}`}
          >
            <b className={`font-bold ${tone.painLabel}`}>The problem:</b> {band.pain}
          </p>
          <h2 className="mt-5 mb-3.5 font-display text-[clamp(2rem,4.4vw,3rem)]/[1.08] font-bold tracking-[-0.03em] text-balance text-ru-n-700">
            {band.title}
          </h2>
          <p className="max-w-118 text-[clamp(1.0625rem,2vw,1.1875rem)]/[1.6] text-ru-n-500">
            {band.lede}
          </p>
          <ol className="my-6.5 flex list-none flex-col gap-4 p-0">
            {band.points.map((point, i) => (
              <li key={point.title} className="flex items-start gap-3.5">
                <span
                  className={`flex size-7.5 flex-none items-center justify-center rounded-[9px] font-display text-[14px] font-extrabold ${tone.num}`}
                >
                  {i + 1}
                </span>
                <span>
                  <b className="block font-display text-[17px]/[1.3] font-bold text-ru-n-700">
                    {point.title}
                  </b>
                  <span className="text-[15px]/[1.5] text-ru-n-500">{point.body}</span>
                </span>
              </li>
            ))}
          </ol>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
            <Link
              to={band.cta.to}
              className="group inline-flex h-11.5 items-center gap-2 rounded-full bg-ru-blue-600 px-5.5 text-[15px] font-semibold text-white transition-colors hover:bg-ru-blue-700"
            >
              {band.cta.label}
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" />
            </Link>
            {band.note && (
              <Link
                to={band.note.to}
                className="text-[14.5px] font-semibold text-ru-blue-600 underline-offset-4 hover:underline"
              >
                {band.note.label}
              </Link>
            )}
          </div>
        </div>

        {/* The scene is illustration: every claim in it is also in the text beside it. */}
        <div
          aria-hidden="true"
          style={{ animationDelay: "120ms" }}
          className={`relative h-145 overflow-hidden rounded-[32px] bg-[radial-gradient(380px_320px_at_55%_55%,rgba(46,104,168,0.5),transparent_72%),linear-gradient(160deg,var(--color-ru-blue-800),var(--color-ru-blue-900)_46%,var(--color-ru-blue-950))] motion-reduce:animate-none max-sm:h-118 max-sm:rounded-3xl ${shown ? "animate-ru-rise" : "opacity-0"} ${flipped ? "lg:order-1" : ""}`}
        >
          <div className="pointer-events-none absolute inset-0 bg-[repeating-radial-gradient(circle_at_120%_130%,transparent_0_46px,rgba(144,178,220,0.07)_47px_48px)]" />
          {band.scene}
        </div>
      </div>
    </section>
  );
}

/** One band per job in the overview, in the same order and colours, each opening on its problem. */
export default function JobBands() {
  return (
    <>
      <header className="border-t border-ru-n-100 bg-white px-5 pt-12 sm:pt-18">
        <div className="mx-auto max-w-190 text-center">
          <StarLabel>See it in action</StarLabel>
          <h2 className="font-display text-[clamp(2rem,5vw,3.25rem)]/[1.08] font-bold tracking-[-0.03em] text-balance text-ru-n-700">
            From first hello to <span className="text-[#0F8C4C]">loyal regular.</span>
          </h2>
        </div>
      </header>
      {BANDS.map((band, i) => (
        <JobBand key={band.id} band={band} index={i} />
      ))}
    </>
  );
}
