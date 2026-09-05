import { useEffect, useRef, useState } from "react";

/**
 * The hero's phone: a loyalty conversation that plays out — an order, points landing, a balance
 * card counting up, quick replies, and a redemption code.
 *
 * A different handset from the ones on the broadcast and Business API pages, so it does not share
 * their `PhoneFrame`: this design draws a 320px body with no status bar and no side buttons, a
 * 600px screen, and a header with the WhatsApp tile on the right rather than call icons.
 *
 * The finished thread is what renders on the server and for `prefers-reduced-motion`, so a
 * crawler and a reader who asked for stillness get the whole conversation.
 */

type Step =
  | "order"
  | "typing1"
  | "confirmed"
  | "typing2"
  | "earned"
  | "card"
  | "replies"
  | "redeem"
  | "typing3"
  | "done";

/** Each step and how long it holds, in ms. The sequence loops. */
const SEQUENCE: readonly (readonly [Step, number])[] = [
  ["order", 880],
  ["typing1", 1050],
  ["confirmed", 900],
  ["typing2", 950],
  ["earned", 1020],
  ["card", 1950],
  ["replies", 1650],
  ["redeem", 780],
  ["typing3", 980],
  ["done", 3500],
];

const ORDER = SEQUENCE.map(([step]) => step);
const at = (step: Step) => ORDER.indexOf(step);

function useLoyaltySequence() {
  // Server render and the reduced-motion path both settle on the finished thread.
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

/** The balance ticks 420 → 540 when the card appears. */
function Balance({ live }: Readonly<{ live: boolean }>) {
  const [value, setValue] = useState(540);
  const raf = useRef(0);

  useEffect(() => {
    if (!live) return;
    if (globalThis.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / 1100);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(Math.round(420 + 120 * eased));
      if (p < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [live]);

  return (
    <span className="font-display text-2xl font-bold tracking-[-0.03em] tabular-nums text-ru-blue-600">
      {value}
    </span>
  );
}

function Typing() {
  return (
    <div className="inline-flex flex-none items-center gap-1 self-start rounded-2xl rounded-bl-xs border border-ru-n-200 bg-white px-3.5 py-2.75">
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

const OUT =
  "flex-none max-w-[80%] self-end rounded-2xl rounded-br-xs bg-ru-blue-600 px-3.25 py-2.5 text-sm/[1.5] text-white animate-ru-msg-in";
const IN =
  "flex-none max-w-[88%] self-start rounded-2xl rounded-bl-xs border border-ru-n-200 bg-white px-3.25 py-2.5 text-sm/[1.5] text-ru-n-600 animate-ru-msg-in";

export default function PhoneMock() {
  const index = useLoyaltySequence();
  const shown = (step: Step) => index >= at(step);

  return (
    <div className="relative flex min-w-0 justify-center">
      <div className="relative w-[min(100%,320px)] rounded-[38px] bg-ru-blue-900 p-2.25 shadow-[0_24px_64px_rgba(16,24,40,0.1)]">
        <div className="flex h-150 flex-col overflow-hidden rounded-[30px] bg-white">
          {/* Header */}
          <div className="flex flex-none items-center gap-2.5 border-b border-ru-n-200 bg-ru-n-50 px-4 py-3.5">
            <span className="flex size-8 flex-none items-center justify-center rounded-full bg-ru-blue-600 text-[12.5px] font-semibold text-white">
              AS
            </span>
            <div>
              <div className="text-sm/[1.2] font-medium text-ru-n-700">Aurelia Skincare</div>
              <div className="text-xs text-ru-n-400">Business account · online</div>
            </div>
            <span className="ml-auto flex size-5.5 flex-none items-center justify-center rounded-[5px] bg-wa-green">
              <svg viewBox="0 0 24 24" fill="#fff" className="size-3.25" aria-hidden="true">
                <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm5.3 14c-.2.6-1.2 1.2-1.7 1.2-.5.1-1 .1-1.7-.1a11 11 0 0 1-4.6-3.2c-1-1.2-1.5-2.3-1.6-3 0-.6.2-1.2.6-1.6.2-.2.4-.3.6-.3h.5c.2 0 .3.1.4.4l.6 1.4c.1.2 0 .4-.1.5l-.4.5c-.1.2-.2.3 0 .6.5.9 1.6 1.9 2.6 2.3.2.1.4.1.5 0l.6-.6c.2-.2.3-.2.5-.1l1.4.7c.3.1.4.2.4.4s0 .6-.1.9Z" />
              </svg>
            </span>
          </div>

          {/* Thread */}
          <div className="flex flex-1 flex-col justify-end gap-2.5 overflow-hidden bg-ru-n-50 px-3.5 py-4">
            <span className="self-center pb-0.5 text-[11px] font-semibold tracking-[0.08em] text-ru-n-400 uppercase">
              Today
            </span>

            {shown("order") && (
              <div className={OUT}>
                Just grabbed the Hydrating Skin Kit 🛍️
                <span className="mt-1 block text-right text-[11.5px] text-white/72">18:02 ✓✓</span>
              </div>
            )}

            {index === at("typing1") && <Typing />}

            {shown("confirmed") && (
              <div className={IN}>
                Order #4821 confirmed — on its way, Meera!
                <span className="mt-1 block text-[11.5px] text-ru-n-400">18:02</span>
              </div>
            )}

            {index === at("typing2") && <Typing />}

            {shown("earned") && (
              <div className={IN}>
                You just earned <span className="font-semibold text-ru-amber-700">+120 points</span>
                .<span className="mt-1 block text-[11.5px] text-ru-n-400">18:02</span>
              </div>
            )}

            {shown("card") && (
              <div className="flex-none max-w-[88%] animate-ru-msg-in self-start rounded-2xl rounded-bl-xs border border-ru-n-200 bg-white px-3.25 py-3">
                <div className="flex items-center justify-between gap-3 py-1.5 text-[13px] text-ru-n-500">
                  <span>Total balance</span>
                  <Balance live={index === at("card")} />
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

            {shown("replies") && !shown("redeem") && (
              <div className="flex flex-col gap-1.75 self-stretch">
                {["Redeem now", "My points", "View offers"].map((label, i) => (
                  <div
                    key={label}
                    style={{ animationDelay: `${0.11 * (i + 1)}s` }}
                    className="flex animate-ru-msg-in items-center justify-center gap-1.75 rounded-lg border border-ru-blue-200 bg-white p-2.25 text-[13.5px] font-semibold text-ru-blue-600"
                  >
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
                ))}
              </div>
            )}

            {shown("redeem") && (
              <div className={OUT}>
                Redeem now
                <span className="mt-1 block text-right text-[11.5px] text-white/72">18:02 ✓✓</span>
              </div>
            )}

            {index === at("typing3") && <Typing />}

            {shown("done") && (
              <div className={IN}>
                Done — code <strong className="font-semibold text-ru-n-700">RATEUP120</strong> is
                live at checkout for 7 days 🎁
                <span className="mt-1 block text-[11.5px] text-ru-n-400">18:02</span>
              </div>
            )}
          </div>

          {/* Composer */}
          <div className="flex flex-none items-center gap-2.5 border-t border-ru-n-200 bg-white px-3.5 py-2.75">
            <span className="flex-1 rounded-full border border-ru-n-200 bg-ru-n-50 px-3.5 py-2.25 text-[13px] text-ru-n-400">
              Message
            </span>
            <span className="flex size-8.5 flex-none items-center justify-center rounded-full bg-ru-blue-600 text-white">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
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
