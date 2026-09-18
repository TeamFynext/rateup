import type { CSSProperties, ReactNode } from "react";

import { InstagramMark, MessengerMark, WhatsAppMark } from "../channel-marks";

/* Every mockup reveals once, when its own tile scrolls into view (`useReveal`). The stagger
   is what makes each one read as data arriving rather than as a card sliding in. */

/** The bento's default tile: icon, title, copy, then an optional visual pinned to the bottom. */
export function MockCard({
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
      className={`flex flex-col gap-3.5 rounded-[20px] border border-ru-n-200 bg-white p-5.5 transition-all hover:-translate-y-0.5 hover:border-ru-blue-200 hover:shadow-lg motion-reduce:transition-none sm:p-7 ${className}`}
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
export function Inset({
  children,
  className = "",
}: Readonly<{ children: ReactNode; className?: string }>) {
  return (
    <div className={`mt-auto rounded-xl border border-ru-n-200 bg-ru-n-50 p-3.5 ${className}`}>
      {children}
    </div>
  );
}

export function Avatar({
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

export type Channel = "whatsapp" | "instagram" | "messenger";

const CHANNEL_TILES: Record<Channel, { tile: string; mark: ReactNode }> = {
  whatsapp: { tile: "bg-wa-green", mark: <WhatsAppMark className="size-[62%]" /> },
  instagram: {
    tile: "bg-[linear-gradient(45deg,#FEDA75_0%,#FA7E1E_26%,#D62976_58%,#962FBF_82%,#4F5BD5_100%)]",
    mark: <InstagramMark className="size-[58%]" />,
  },
  messenger: {
    tile: "bg-[linear-gradient(135deg,#00C6FF_0%,#0068FF_100%)]",
    mark: <MessengerMark className="size-[64%]" />,
  },
};

/** The channel badge that sits on the corner of an inbox avatar. */
export function ChannelDot({
  channel,
  className = "",
}: Readonly<{ channel: Channel; className?: string }>) {
  const { tile, mark } = CHANNEL_TILES[channel];
  return (
    <span
      className={`flex size-3.5 items-center justify-center rounded-full text-white ring-2 ring-white ${tile} ${className}`}
    >
      {mark}
    </span>
  );
}

/** Received bubble, WhatsApp-style. `className` carries the reveal transition. */
export function BubbleIn({
  children,
  className = "",
  style,
}: Readonly<{ children: ReactNode; className?: string; style?: CSSProperties }>) {
  return (
    <div
      style={style}
      className={`max-w-[88%] self-start rounded-[16px_16px_16px_4px] border border-ru-n-200 bg-white px-3.25 py-2.5 text-[14.5px]/[1.5] text-ru-n-600 ${className}`}
    >
      {children}
    </div>
  );
}

export function BubbleOut({
  children,
  className = "",
  style,
}: Readonly<{ children: ReactNode; className?: string; style?: CSSProperties }>) {
  return (
    <div
      style={style}
      className={`max-w-[80%] self-end rounded-[16px_16px_4px_16px] bg-ru-blue-600 px-3.25 py-2.5 text-[14.5px]/[1.5] text-white ${className}`}
    >
      {children}
    </div>
  );
}

export const bubbleReveal = (shown: boolean) =>
  `transition-[opacity,transform] duration-500 ease-out motion-reduce:transition-none ${
    shown ? "translate-y-0 opacity-100" : "translate-y-1.5 opacity-0"
  }`;
