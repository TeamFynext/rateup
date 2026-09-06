import { useState } from "react";

import { BROADCAST_FAQS } from "./content";

/**
 * The FAQ, drawn as the design's two-column split: the question the section answers on the left,
 * the rows on the right.
 *
 * Every answer stays in the DOM and is hidden with `hidden` rather than being unmounted — the
 * route's `FAQPage` JSON-LD is built from this same array, and Google requires the answer text
 * to actually be on the page it is described on.
 */
export default function Faq() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section className="pb-[clamp(3rem,7vw,5.5rem)]">
      <div className="mx-auto grid max-w-280 grid-cols-[repeat(auto-fit,minmax(320px,1fr))] items-start gap-14 px-5">
        <h2 className="font-display text-[clamp(1.625rem,3.6vw,2.25rem)]/[1.12] font-bold tracking-[-0.028em] text-pretty text-ru-n-700">
          Marketing teams ask these six questions before their first broadcast.
        </h2>
        <div>
          {BROADCAST_FAQS.map((faq, index) => {
            const open = openIndex === index;
            return (
              <div key={faq.question} className="border-b border-ru-n-100">
                <h3>
                  <button
                    type="button"
                    aria-expanded={open}
                    onClick={() => setOpenIndex(open ? null : index)}
                    className="flex w-full cursor-pointer items-center justify-between gap-4 py-4.5 text-left text-[17px]/[1.35] font-medium tracking-[-0.01em] text-ru-n-700"
                  >
                    {faq.question}
                    <svg
                      width="17"
                      height="17"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      aria-hidden="true"
                      className={`flex-none text-ru-n-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
                    >
                      <path d="M6 9l6 6 6-6" />
                    </svg>
                  </button>
                </h3>
                <p
                  hidden={!open}
                  className="max-w-[66ch] pb-5 text-base/[1.6] text-ru-n-500 not-[[hidden]]:animate-ru-rise"
                >
                  {faq.answer}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
