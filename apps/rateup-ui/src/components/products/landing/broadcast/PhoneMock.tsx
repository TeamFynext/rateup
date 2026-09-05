import { useEffect, useState } from "react";

import PhoneFrame, { Ticks, Typing } from "../shared/PhoneFrame";

/**
 * The hero's phone mock: a WhatsApp thread that plays a broadcast landing, the customer
 * replying, and an automated answer closing the loop.
 *
 * The sequence runs on a six-step timer and loops. It renders at its **final** step on the
 * server and for anyone with `prefers-reduced-motion: reduce`, so a crawler and a reader who has
 * asked for stillness both get the complete conversation rather than an empty phone — the same
 * order `CountUp` and `useReveal` use in `home-ui`.
 */

/** How long each step holds before the next one, in ms. Index 0 is unused. */
const HOLDS = [0, 900, 1000, 1200, 1300, 1600, 2600];
const LAST_STEP = 6;

function useChatSequence() {
  // Server render and the reduced-motion path both settle on the finished thread.
  const [step, setStep] = useState(LAST_STEP);

  useEffect(() => {
    if (globalThis.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

    let current = 1;
    setStep(current);

    // `setTimeout` types as NodeJS.Timeout under this tsconfig's lib set, so the handle is
    // held as the return type rather than being narrowed to a number.
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      current = current >= LAST_STEP ? 1 : current + 1;
      setStep(current);
      timer = globalThis.setTimeout(tick, HOLDS[current]);
    };
    timer = globalThis.setTimeout(tick, HOLDS[current]);

    return () => globalThis.clearTimeout(timer);
  }, []);

  return step;
}

const BUBBLE_IN = "animate-ru-msg-in";

export default function PhoneMock() {
  const step = useChatSequence();

  return (
    <PhoneFrame initial="N" name="Northside Co.">
      <div
        className={`flex-none ml-auto max-w-[88%] overflow-hidden rounded-2xl rounded-br-sm border border-ru-green-100 bg-ru-green-50 shadow-xs ${BUBBLE_IN}`}
      >
        <div className="flex h-26 items-center justify-center border-b border-ru-green-100 bg-ru-blue-100">
          <svg
            width="26"
            height="26"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-ru-blue-400"
            aria-hidden="true"
          >
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <circle cx="9" cy="9" r="2" />
            <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
          </svg>
        </div>
        <div className="px-3.25 pt-2.5 pb-2">
          <span className="mb-1.75 inline-flex h-4.5 items-center rounded-md border border-ru-green-100 bg-white px-1.75 text-[10.5px] font-semibold tracking-[0.06em] text-ru-green-600 uppercase">
            Marketing
          </span>
          <p className="text-[14.5px]/[1.45] text-ru-n-700">
            Hi{" "}
            <span className="rounded border border-ru-green-100 bg-white px-1.25 py-px font-medium text-ru-green-600">
              Ananya
            </span>
            , the festive collection is live. Flat 12% off until Sunday. 🌟
          </p>
          <div className="mt-1.25 flex items-center justify-end gap-1.25 text-[11px] text-ru-n-400">
            <span>10:42</span>
            {step === 1 && <Ticks tone="sent" />}
            {step === 2 && <Ticks tone="delivered" />}
            {step >= 3 && <Ticks tone="read" />}
          </div>
        </div>
        {[
          { label: "Shop the collection", icon: "link" },
          { label: "Copy offer code", icon: "copy" },
        ].map((button) => (
          <div
            key={button.label}
            className="flex items-center justify-center gap-1.75 border-t border-ru-green-100 p-2.75 text-sm font-semibold text-ru-green-600"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.9"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              {button.icon === "link" ? (
                <>
                  <path d="M15 3h6v6" />
                  <path d="M10 14 21 3" />
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h6" />
                </>
              ) : (
                <>
                  <rect x="9" y="9" width="12" height="12" rx="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </>
              )}
            </svg>
            {button.label}
          </div>
        ))}
      </div>

      {step === 3 && <Typing />}

      {step >= 4 && (
        <div
          className={`flex-none max-w-[78%] rounded-2xl rounded-bl-sm border border-ru-n-200 bg-white px-3.25 pt-2.5 pb-2 text-[14.5px]/[1.45] text-ru-n-700 shadow-xs ${BUBBLE_IN}`}
        >
          <div>Is the 12% valid on gold coins too?</div>
          <div className="mt-1 flex justify-end text-[11px] text-ru-n-400">10:43</div>
        </div>
      )}

      {step >= 5 && (
        <div
          className={`flex-none ml-auto max-w-[88%] rounded-2xl rounded-br-sm border border-ru-green-100 bg-ru-green-50 px-3.25 pt-2.5 pb-2 shadow-xs ${BUBBLE_IN}`}
        >
          <p className="text-[14.5px]/[1.45] text-ru-n-700">
            Yes — coins included. Reply <strong className="font-semibold">BOOK</strong> and we will
            hold a slot at your home store.
          </p>
          <div className="mt-1.25 flex items-center justify-end gap-1.25 text-[11px] text-ru-n-400">
            <span>10:43</span>
            <Ticks tone="read" />
          </div>
        </div>
      )}

      {step >= 6 && (
        <div
          className={`flex-none max-w-[58%] rounded-2xl rounded-bl-sm border border-ru-n-200 bg-white px-3.25 pt-2.5 pb-2 text-[14.5px]/[1.45] text-ru-n-700 shadow-xs ${BUBBLE_IN}`}
        >
          <div>BOOK 🌟</div>
          <div className="mt-1 flex justify-end text-[11px] text-ru-n-400">10:44</div>
        </div>
      )}
    </PhoneFrame>
  );
}
