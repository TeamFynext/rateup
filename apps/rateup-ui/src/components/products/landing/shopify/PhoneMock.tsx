import { useEffect, useState } from "react";

import PhoneFrame, { Typing } from "../shared/PhoneFrame";

/**
 * The hero's phone: the whole post-purchase journey playing out — confirmation, shipping, a
 * track tap, a delivery rating, and points landing on a balance card.
 *
 * The handset itself comes from the shared `PhoneFrame`. This design drew a fourth set of
 * dimensions (326px body, 42px radius, 626px screen); the site ships one phone rather than four
 * near-identical ones.
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
    <PhoneFrame initial="UB" name="Urban Bazaar">
      {shown("confirmed") && (
        <In>
          Hi Asha, order #1042 is confirmed — total ₹2,499. We'll message you the moment it ships.
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
          5 stars 🙌<span className="mt-1 block text-right text-[11.5px] text-white/72">17:54</span>
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
    </PhoneFrame>
  );
}
