import { useState } from "react";

import { LOYALTY_FAQS } from "./content";

/**
 * The FAQ accordion.
 *
 * Answers stay in the DOM behind `hidden` rather than being unmounted — the route's `FAQPage`
 * JSON-LD is built from this same array, and the answer text has to be on the page it describes.
 */
export default function Faq() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section id="faq" className="bg-ru-n-50 py-[clamp(3.5rem,8vw,6.5rem)]">
      <div className="mx-auto max-w-290 px-5">
        <div className="mx-auto mb-[clamp(2rem,4vw,3rem)] max-w-165 text-center">
          <div className="mb-3.5 text-[12.5px] font-semibold tracking-[0.1em] text-ru-blue-500 uppercase">
            FAQ
          </div>
          <h2 className="font-display text-[clamp(2rem,5vw,3.25rem)]/[1.08] font-bold tracking-[-0.03em] text-balance text-ru-n-700">
            Questions, answered.
          </h2>
        </div>

        <div className="mx-auto max-w-205 border-t border-ru-n-100">
          {LOYALTY_FAQS.map((faq, index) => {
            const open = openIndex === index;
            return (
              <div key={faq.question} className="border-b border-ru-n-100">
                <h3>
                  <button
                    type="button"
                    aria-expanded={open}
                    onClick={() => setOpenIndex(open ? null : index)}
                    className="flex w-full cursor-pointer items-center justify-between gap-4 px-0.5 py-5 text-left font-display text-[16.5px] font-bold tracking-[-0.015em] text-ru-n-700"
                  >
                    <span>{faq.question}</span>
                    <span
                      className={`flex flex-none text-ru-n-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
                    >
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.9"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="size-4.5"
                        aria-hidden="true"
                      >
                        <path d="m6 9 6 6 6-6" />
                      </svg>
                    </span>
                  </button>
                </h3>
                <p
                  hidden={!open}
                  className="max-w-[64ch] px-0.5 pb-5.5 text-[15px]/[1.6] text-ru-n-500 not-[[hidden]]:animate-ru-rise"
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
