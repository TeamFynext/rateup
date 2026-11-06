import { Link } from "@tanstack/react-router";
import { useState } from "react";

import { BOOK_DEMO_ROUTE } from "@/components/RateupHomePage/helper/BookDemoLink";

import { BUSINESS_API_FAQS } from "./content";

/**
 * The FAQ, in the design's 5fr/7fr split.
 *
 * Answers stay in the DOM behind `hidden` rather than being unmounted — the route's `FAQPage`
 * JSON-LD is built from this same array, and the answer text has to be on the page it describes.
 */
export default function Faq() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section className="border-t border-ru-n-100 bg-ru-n-50">
      <div className="mx-auto grid max-w-280 grid-cols-1 gap-11 px-5 py-[clamp(3rem,7vw,5.5rem)] lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <div>
          <span className="text-[11.5px] font-semibold tracking-[0.1em] text-ru-blue-500 uppercase">
            Questions
          </span>
          <h2 className="mt-3 mb-3.5 font-display text-[clamp(1.625rem,3.6vw,2.25rem)]/[1.12] font-bold tracking-[-0.028em] text-balance text-ru-n-700">
            Before you connect your number
          </h2>
          <p className="max-w-[34ch] text-[15.5px]/[1.6] text-ru-n-500">
            Still unsure which way round the setup goes?{" "}
            <Link
              to={BOOK_DEMO_ROUTE}
              className="font-medium text-ru-blue-600 underline underline-offset-2 hover:text-ru-blue-700"
            >
              Book a demo
            </Link>{" "}
            — it's usually a ten-minute conversation.
          </p>
        </div>

        <div>
          {BUSINESS_API_FAQS.map((faq, index) => {
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
