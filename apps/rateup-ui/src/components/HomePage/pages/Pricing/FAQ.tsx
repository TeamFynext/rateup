import { useMemo } from "react";

import type { RateupPaymentPlan } from "@/backend/payment/payment.api";

import { buildFaqs } from "./faq.data.ts";

/**
 * The billing questions, as a plain read-through list rather than an accordion: every
 * answer here is short enough to read at a glance, and a visitor comparing plans should
 * not have to click each one open to find the one that applies to them.
 */
export function Faq({
  plans,
  showPrices = true,
}: Readonly<{ plans?: RateupPaymentPlan[]; showPrices?: boolean }>) {
  const entries = useMemo(() => buildFaqs(plans, showPrices), [plans, showPrices]);

  return (
    <section className="mx-auto max-w-[1240px] px-8 pt-18">
      <h2 className="font-display m-0 mb-2 text-[26px] font-bold leading-[1.12] tracking-[-0.028em] text-foreground md:text-[36px]">
        Billing questions
      </h2>
      <div className="max-w-[78ch]">
        {entries.map((entry) => (
          <div key={entry.question} className="border-b border-border py-5">
            <p className="font-display m-0 mb-1.5 text-[17px] font-medium leading-[1.35] text-foreground">
              {entry.question}
            </p>
            {Array.isArray(entry.answer) ? (
              <ul className="m-0 flex list-none flex-col gap-1 p-0 text-[15px] leading-[1.6] text-muted-foreground">
                {entry.answer.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            ) : (
              <p className="m-0 text-[15px] leading-[1.6] text-muted-foreground">{entry.answer}</p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
