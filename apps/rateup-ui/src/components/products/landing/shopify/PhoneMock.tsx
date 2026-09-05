import { useEffect, useState } from "react";

/**
 * The hero's phone: the whole post-purchase journey playing out — confirmation, shipping, a
 * track tap, a delivery rating, and points landing on a balance card.
 *
 * A fourth set of handset dimensions (326px body, 42px radius, 626px screen, 3px side buttons),
 * so it does not share `landing/shared/PhoneFrame` — that one carries the broadcast and Business
 * API designs, which specify identical chrome to each other but not to this.
 *
 * The finished thread renders on the server and under `prefers-reduced-motion`, so a crawler and
 * a reader who asked for stillness both get the whole conversation.
 *
 * The design offers India/UAE/Singapore as a canvas prop; India is its default and the only one
 * a real visitor would see, so the currency and courier are fixed to it.
 */

type Step =
  | "confirmed"
  | "typing1"
  | "shipped"
  | "trackReply"
  | "trackTap"
  | "typing2"
  | "delivered"
  | "rateReply"
  | "rateTap"
  | "typing3"
  | "thanks"
  | "card";

const SEQUENCE: readonly (readonly [Step, number])[] = [
  ["confirmed", 900],
  ["typing1", 1000],
  ["shipped", 640],
  ["trackReply", 1500],
  ["trackTap", 820],
  ["typing2", 950],
  ["delivered", 620],
  ["rateReply", 1600],
  ["rateTap", 820],
  ["typing3", 900],
  ["thanks", 560],
  ["card", 5200],
];

const ORDER = SEQUENCE.map(([step]) => step);
const at = (step: Step) => ORDER.indexOf(step);

function useJourney() {
  const [index, setIndex] = useState(SEQUENCE.length - 1);

  useEffect(() => {
    if (globalThis.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

    let i = 0;
    setIndex(0);
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      i = (i + 1) % SEQUENCE.length;
      setIndex(i);
      timer = globalThis.setTimeout(tick, SEQUENCE[i][1]);
    };
    timer = globalThis.setTimeout(tick, SEQUENCE[0][1]);
    return () => globalThis.clearTimeout(timer);
  }, []);

  return index;
}

function Typing() {
  return (
    <div className="inline-flex flex-none animate-ru-msg-in items-center gap-1 self-start rounded-[18px] rounded-bl-xs border border-ru-n-200 bg-white px-3.5 py-2.75">
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

function In({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex-none max-w-[88%] animate-ru-msg-in self-start rounded-[18px] rounded-bl-xs border border-ru-n-200 bg-white px-3.25 py-2.5 text-sm/[1.5] text-ru-n-600">
      {children}
    </div>
  );
}

function Out({ text }: Readonly<{ text: string }>) {
  return (
    <div className="flex-none max-w-[80%] animate-ru-msg-in self-end rounded-[18px] rounded-br-xs bg-ru-blue-600 px-3.25 py-2.5 text-sm/[1.5] text-white">
      {text}
      <span className="mt-1 block text-right text-[11.5px] text-white/72">14:03</span>
    </div>
  );
}

function QuickReply({ label }: Readonly<{ label: string }>) {
  return (
    <div className="flex animate-ru-msg-in items-center justify-center gap-1.75 self-stretch rounded-lg border border-ru-blue-200 bg-white p-2.25 text-[13.5px] font-semibold text-ru-blue-600">
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="size-3.5"
        aria-hidden="true"
      >
        <path d="M5 12h13M13 6l6 6-6 6" />
      </svg>
      <span>{label}</span>
    </div>
  );
}

function Stamp({ time }: Readonly<{ time: string }>) {
  return <span className="mt-1 block text-[11.5px] text-ru-n-400">{time}</span>;
}

export default function PhoneMock() {
  const index = useJourney();
  const shown = (step: Step) => index >= at(step);

  return (
    <div className="relative flex min-w-0 justify-center">
      <div className="relative w-[min(100%,326px)] rounded-[42px] bg-ru-blue-900 p-2.5 shadow-[0_24px_64px_rgba(16,24,40,0.1)]">
        <span
          aria-hidden="true"
          className="absolute top-33 -left-0.75 h-6.5 w-0.75 rounded-l-[3px] bg-ru-blue-800"
        />
        <span
          aria-hidden="true"
          className="absolute top-44 -left-0.75 h-11 w-0.75 rounded-l-[3px] bg-ru-blue-800"
        />
        <span
          aria-hidden="true"
          className="absolute top-37.5 -right-0.75 h-14.5 w-0.75 rounded-r-[3px] bg-ru-blue-800"
        />

        <div className="flex h-156.5 flex-col overflow-hidden rounded-[33px] bg-white">
          {/* Status bar */}
          <div className="relative flex h-9.5 flex-none items-center justify-between bg-ru-n-50 px-4.5">
            <span className="text-[11.5px] font-semibold tabular-nums text-ru-n-600">9:41</span>
            <span
              aria-hidden="true"
              className="absolute top-1.75 left-1/2 h-5.5 w-19.5 -translate-x-1/2 rounded-full bg-ru-blue-950"
            />
            <span aria-hidden="true" className="flex items-end gap-1.25">
              <span className="flex items-end gap-[1.5px]">
                {[4, 6, 8, 10].map((h) => (
                  <span
                    key={h}
                    style={{ height: `${h}px` }}
                    className="w-[2.5px] rounded-[1px] bg-ru-n-500"
                  />
                ))}
              </span>
              <span className="relative h-2.25 w-4.25 rounded-[2.5px] border border-ru-n-400 p-px">
                <span className="block h-full w-[70%] rounded-[1.5px] bg-ru-n-500" />
              </span>
            </span>
          </div>

          {/* Header */}
          <div className="flex flex-none items-center gap-2.5 border-b border-ru-n-200 bg-ru-n-50 px-3.5 py-3">
            <span className="flex size-8 flex-none items-center justify-center rounded-full bg-ru-blue-600 font-display text-[12.5px] font-bold text-white">
              UB
            </span>
            <span className="flex min-w-0 flex-col gap-px">
              <span className="text-sm/[1.2] font-medium text-ru-n-700">Urban Bazaar</span>
              <span className="text-xs text-ru-n-400">Business account · online</span>
            </span>
            <span className="ml-auto flex size-5.5 flex-none items-center justify-center rounded-[5px] bg-wa-green">
              <svg viewBox="0 0 24 24" fill="#fff" className="size-3.25" aria-hidden="true">
                <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm5.3 14c-.2.6-1.2 1.2-1.7 1.2-.5.1-1 .1-1.7-.1a11 11 0 0 1-4.6-3.2c-1-1.2-1.5-2.3-1.6-3 0-.6.2-1.2.6-1.6.2-.2.4-.3.6-.3h.5c.2 0 .3.1.4.4l.6 1.4c.1.2 0 .4-.1.5l-.4.5c-.1.2-.2.3 0 .6.5.9 1.6 1.9 2.6 2.3.2.1.4.1.5 0l.6-.6c.2-.2.3-.2.5-.1l1.4.7c.3.1.4.2.4.4s0 .6-.1.9Z" />
              </svg>
            </span>
          </div>

          {/* Thread */}
          <div className="flex min-h-0 flex-1 flex-col justify-end gap-2.5 overflow-hidden bg-ru-n-50 px-3.5 py-4">
            <span className="flex-none self-center rounded-full bg-ru-n-100 px-2.5 py-0.75 text-[11px] font-semibold tracking-[0.08em] text-ru-n-400 uppercase">
              Today
            </span>

            {shown("confirmed") && (
              <In>
                Hi Asha, order #1042 is confirmed — total ₹2,499. We'll message you the moment it
                ships.
                <Stamp time="10:24" />
              </In>
            )}

            {index === at("typing1") && <Typing />}

            {shown("shipped") && (
              <In>
                Order #1042 has shipped with BlueDart. Arriving Thursday.
                <Stamp time="14:02" />
              </In>
            )}

            {index === at("trackReply") && <QuickReply label="Track order" />}
            {shown("trackTap") && <Out text="Track order" />}

            {index === at("typing2") && <Typing />}

            {shown("delivered") && (
              <In>
                Delivered at 5:40 PM. How did we do? Tap to rate — it takes 10 seconds.
                <Stamp time="17:52" />
              </In>
            )}

            {index === at("rateReply") && <QuickReply label="Rate your order" />}

            {shown("rateTap") && (
              <div className="flex-none max-w-[80%] animate-ru-msg-in self-end rounded-[18px] rounded-br-xs bg-ru-blue-600 px-3.25 py-2.5 text-sm/[1.5] text-white">
                5 stars 🙌
                <span className="mt-1 block text-right text-[11.5px] text-white/72">17:54</span>
              </div>
            )}

            {index === at("typing3") && <Typing />}

            {shown("thanks") && (
              <In>
                Thank you, Asha.
                <span className="font-semibold text-ru-amber-700"> +50 points added.</span>
                <Stamp time="17:54" />
              </In>
            )}

            {shown("card") && (
              <div className="flex-none max-w-[88%] animate-ru-msg-in self-start rounded-[18px] rounded-bl-xs border border-ru-n-200 bg-white px-3.25 py-3">
                <div className="flex items-center justify-between gap-3 py-1.5 text-[13px] text-ru-n-500">
                  <span>Points balance</span>
                  <span className="font-display text-2xl font-bold tracking-[-0.03em] tabular-nums text-ru-blue-600">
                    320
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3 border-t border-ru-n-100 py-1.5 text-[13px] text-ru-n-500">
                  <span>Your tier</span>
                  <span className="text-[13.5px] font-semibold text-ru-n-700">Silver member</span>
                </div>
                <div className="flex items-center justify-between gap-3 border-t border-ru-n-100 py-1.5 text-[13px] text-ru-n-500">
                  <span>Reward unlocked</span>
                  <span className="text-[13.5px] font-semibold text-ru-amber-700">₹120 off</span>
                </div>
              </div>
            )}
          </div>

          {/* Composer */}
          <div className="flex flex-none items-center gap-2.5 border-t border-ru-n-200 bg-white px-3.5 py-2.75">
            <span className="flex-1 rounded-full border border-ru-n-200 bg-ru-n-50 px-3.5 py-2.25 text-[13px] text-ru-n-400">
              Message
            </span>
            <span className="flex size-8.5 flex-none items-center justify-center rounded-full bg-ru-blue-600">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="#fff"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="size-4"
                aria-hidden="true"
              >
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="23" />
              </svg>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
