import { useEffect, useRef, useState } from "react";

import PhoneFrame, { Typing } from "../shared/PhoneFrame";

/**
 * The hero's phone: a loyalty conversation that plays out — an order, points landing, a balance
 * card counting up, quick replies, and a redemption code.
 *
 * The handset itself comes from the shared `PhoneFrame` — this design drew its own 320px body,
 * but four sibling pages with four slightly different phones reads as four mistakes rather than
 * one house style.
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

const OUT =
  "flex-none max-w-[80%] self-end rounded-2xl rounded-br-xs bg-ru-blue-600 px-3.25 py-2.5 text-sm/[1.5] text-white animate-ru-msg-in";
const IN =
  "flex-none max-w-[88%] self-start rounded-2xl rounded-bl-xs border border-ru-n-200 bg-white px-3.25 py-2.5 text-sm/[1.5] text-ru-n-600 animate-ru-msg-in";

export default function PhoneMock() {
  const index = useLoyaltySequence();
  const shown = (step: Step) => index >= at(step);

  return (
    <PhoneFrame initial="AS" name="Aurelia Skincare">
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
          You just earned <span className="font-semibold text-ru-amber-700">+120 points</span>.
          <span className="mt-1 block text-[11.5px] text-ru-n-400">18:02</span>
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
          Done — code <strong className="font-semibold text-ru-n-700">RATEUP120</strong> is live at
          checkout for 7 days 🎁
          <span className="mt-1 block text-[11.5px] text-ru-n-400">18:02</span>
        </div>
      )}
    </PhoneFrame>
  );
}
