import type { ReactNode } from "react";

/**
 * The one handset every product-page chat mock is drawn in.
 *
 * The four designs each specified their own dimensions — 342/320/326px bodies, 46/38/42px radii,
 * three different status bars and two different header treatments. Four almost-identical phones
 * on four sibling pages reads as four mistakes rather than one house style, so the whole frame is
 * fixed here and pages supply only the conversation.
 *
 * It owns: the frame and its side buttons, the status bar, the thread header, the scroll area
 * (including the "Today" divider), the composer and the home indicator. `children` is the run of
 * message bubbles, nothing else.
 */

/** Delivery ticks. Read receipts are blue; sent and delivered are grey. */
export function Ticks({ tone }: Readonly<{ tone: "sent" | "delivered" | "read" }>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`size-3.5 flex-none ${tone === "read" ? "text-ru-blue-400" : "text-ru-n-400"}`}
      aria-hidden="true"
    >
      {tone === "sent" ? (
        <path d="M4 13l4 4L20 7" />
      ) : (
        <>
          <path d="M1 13l4 4L13 7" />
          <path d="M8 13l4 4L20 7" />
        </>
      )}
    </svg>
  );
}

/** The three-dot "typing" bubble. */
export function Typing() {
  return (
    <div className="inline-flex flex-none animate-ru-msg-in items-center gap-1 self-start rounded-2xl rounded-bl-xs border border-ru-n-200 bg-white px-3.5 py-2.75">
      {[0, 0.2, 0.4].map((delay) => (
        <span
          key={delay}
          style={{ animationDelay: `${delay}s` }}
          className="size-1.5 animate-ru-dot rounded-full bg-ru-n-400"
        />
      ))}
    </div>
  );
}

function StatusBar() {
  return (
    <div className="relative z-2 flex h-11 flex-none items-center justify-between bg-ru-n-50 px-5.5 text-[12.5px] font-semibold tabular-nums text-ru-n-700">
      <span>9:41</span>
      <span
        aria-hidden="true"
        className="absolute top-2.25 left-1/2 h-6.5 w-22 -translate-x-1/2 rounded-full bg-ru-blue-900"
      />
      <span className="flex items-center gap-1.5 text-ru-n-600" aria-hidden="true">
        <svg width="17" height="11" viewBox="0 0 17 11" fill="currentColor">
          <rect y="7" width="3" height="4" rx="1" />
          <rect x="4.6" y="4.6" width="3" height="6.4" rx="1" />
          <rect x="9.2" y="2.2" width="3" height="8.8" rx="1" />
          <rect x="13.8" width="3" height="11" rx="1" />
        </svg>
        <svg
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.1"
          strokeLinecap="round"
        >
          <path d="M2.5 8.5a14 14 0 0119 0" />
          <path d="M6 12.4a9 9 0 0112 0" />
          <path d="M9.4 16.2a4.4 4.4 0 015.2 0" />
          <path d="M12 19.6h.01" />
        </svg>
        <svg width="24" height="12" viewBox="0 0 26 13" fill="none">
          <rect
            x="0.5"
            y="0.5"
            width="22"
            height="12"
            rx="3.5"
            stroke="currentColor"
            strokeOpacity="0.38"
          />
          <rect x="2" y="2" width="15" height="9" rx="2" fill="currentColor" />
          <path d="M24.2 4.4v4.2a2.3 2.3 0 000-4.2z" fill="currentColor" fillOpacity="0.38" />
        </svg>
      </span>
    </div>
  );
}

/**
 * The chat header. The green verified tick is the substantive detail in every one of these
 * designs: a message on the official API arrives from a verified business name, not an unknown
 * number.
 */
function ThreadHeader({ initial, name }: Readonly<{ initial: string; name: string }>) {
  return (
    <div className="flex flex-none items-center gap-2.5 border-b border-ru-n-200 bg-ru-n-50 px-3.5 py-2.5">
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="flex-none text-ru-n-500"
        aria-hidden="true"
      >
        <path d="M15 18l-6-6 6-6" />
      </svg>
      <span className="flex size-8 flex-none items-center justify-center rounded-full bg-ru-blue-600 text-[12.5px] font-semibold text-white">
        {initial}
      </span>
      <span className="flex min-w-0 flex-col gap-px">
        <span className="flex items-center gap-1.25">
          <span className="truncate text-sm font-medium text-ru-n-700">{name}</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="flex-none">
            <circle cx="12" cy="12" r="10" className="fill-ru-green-500" />
            <path
              d="M17 9.5l-6.2 6-3.3-3.2"
              stroke="#FFFFFF"
              strokeWidth="2.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        <span className="text-[11.5px] text-ru-n-400">Business account · online</span>
      </span>
      <span className="ml-auto flex items-center gap-3.5 text-ru-n-500" aria-hidden="true">
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M23 7l-7 5 7 5z" />
          <rect x="1" y="5" width="15" height="14" rx="2" />
        </svg>
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M22 16.9v3a2 2 0 01-2.2 2 19.8 19.8 0 01-8.6-3.1 19.5 19.5 0 01-6-6A19.8 19.8 0 012.1 4.2 2 2 0 014.1 2h3a2 2 0 012 1.7c.1 1 .4 1.9.7 2.8a2 2 0 01-.5 2.1L8.1 9.9a16 16 0 006 6l1.3-1.3a2 2 0 012.1-.5c.9.3 1.8.6 2.8.7a2 2 0 011.7 2z" />
        </svg>
      </span>
    </div>
  );
}

function Composer() {
  return (
    <div className="flex flex-none items-center gap-2.25 border-t border-ru-n-200 bg-ru-n-50 px-3.5 pt-2.5 pb-5.5">
      <span className="flex h-9.5 flex-1 items-center gap-2 rounded-full border border-ru-n-200 bg-white px-3.25 text-[13.5px] text-ru-n-400">
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="flex-none"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M8 14s1.5 2 4 2 4-2 4-2" />
          <path d="M9 9h.01" />
          <path d="M15 9h.01" />
        </svg>
        Message
      </span>
      <span className="flex size-9.5 flex-none items-center justify-center rounded-full bg-ru-green-500">
        <svg
          width="17"
          height="17"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
          <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
          <path d="M12 19v3" />
        </svg>
      </span>
    </div>
  );
}

export default function PhoneFrame({
  children,
  initial,
  name,
}: Readonly<{ children: ReactNode; initial: string; name: string }>) {
  return (
    <div className="relative flex min-w-0 justify-center">
      {/* Brand wash behind the device, so the frame does not sit on flat grey. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-[-6%] left-1/2 aspect-square w-[min(620px,130%)] -translate-x-1/2 bg-[radial-gradient(ellipse_at_center,var(--color-ru-blue-50)_0%,transparent_62%)]"
      />

      <div className="relative w-[min(100%,342px)] rounded-[46px] bg-ru-blue-900 p-2.5 shadow-[0_30px_68px_rgba(15,37,64,0.3),inset_0_0_0_1px_rgba(255,255,255,0.1)]">
        {/* Side buttons. Decorative — they are what makes the frame read as a handset. */}
        <span
          aria-hidden="true"
          className="absolute top-34 -left-0.5 h-6.5 w-0.5 rounded-l-sm bg-ru-blue-950"
        />
        <span
          aria-hidden="true"
          className="absolute top-45 -left-0.5 h-11.5 w-0.5 rounded-l-sm bg-ru-blue-950"
        />
        <span
          aria-hidden="true"
          className="absolute top-40.5 -right-0.5 h-16.5 w-0.5 rounded-r-sm bg-ru-blue-950"
        />

        <div className="relative flex h-160 flex-col overflow-hidden rounded-[38px] bg-white">
          <StatusBar />
          <ThreadHeader initial={initial} name={name} />

          <div className="flex min-h-0 flex-1 flex-col justify-end gap-2.25 overflow-hidden bg-ru-n-50 p-3.5">
            <span className="flex-none self-center pb-0.5 text-[10.5px] font-semibold tracking-[0.08em] text-ru-n-400 uppercase">
              Today
            </span>
            {children}
          </div>

          <Composer />
          <span
            aria-hidden="true"
            className="absolute bottom-2 left-1/2 z-3 h-1 w-26.5 -translate-x-1/2 rounded-full bg-ru-n-300"
          />
        </div>
      </div>
    </div>
  );
}
