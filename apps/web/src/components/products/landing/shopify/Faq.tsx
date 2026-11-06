import { Link } from "@tanstack/react-router";
import { useState } from "react";

import { BOOK_DEMO_ROUTE } from "@/components/RateupHomePage/helper/BookDemoLink";

import { SHOPIFY_FAQS } from "./content";
import { H2 } from "./sections";

/**
 * The FAQ, in the design's 0.62fr/1fr split, with the cluster links the design puts under it.
 *
 * Answers stay in the DOM behind `hidden` rather than being unmounted — the route's `FAQPage`
 * JSON-LD is built from this same array, and the answer text has to be on the page it describes.
 */

const RELATED = [
  { to: "/products/whatsapp-business-api", label: "WhatsApp Business API" },
  { to: "/products/whatsapp-broadcast", label: "WhatsApp Broadcast" },
  { to: "/products/whatsapp-loyalty", label: "WhatsApp Loyalty" },
  { to: "/products/whatsapp-feedback", label: "WhatsApp Feedback" },
  { to: "/pricing", label: "Pricing" },
] as const;

export default function Faq() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section className="px-5 py-[clamp(3rem,7vw,5.5rem)]">
      <div className="mx-auto grid max-w-280 grid-cols-1 items-start gap-[clamp(1.5rem,4vw,3.5rem)] lg:grid-cols-[minmax(0,0.62fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-3">
          <H2>Shopify + WhatsApp, answered</H2>
          <p className="text-[15px]/[1.6] text-ru-n-500">
            Still deciding?{" "}
            <Link
              to={BOOK_DEMO_ROUTE}
              className="font-medium text-ru-blue-600 underline underline-offset-2 hover:text-ru-blue-700"
            >
              Book a demo
            </Link>{" "}
            and we'll walk your store's events end to end.
          </p>
        </div>

        <div className="flex flex-col">
          {SHOPIFY_FAQS.map((faq, index) => {
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
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      aria-hidden="true"
                      className={`size-4.25 flex-none text-ru-n-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
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

          <div className="flex flex-wrap gap-x-4 gap-y-2 pt-4.5 text-sm">
            {RELATED.map((link) => (
              <Link key={link.to} to={link.to} className="text-ru-blue-600 hover:text-ru-blue-700">
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
