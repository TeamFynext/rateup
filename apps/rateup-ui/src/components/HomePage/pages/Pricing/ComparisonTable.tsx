import { Fragment } from "react";

import { buildComparison, type PricingTier } from "./pricing.data.ts";

/**
 * The full feature matrix, derived from each plan's own `features` JSON — the same blob
 * the API enforces against — so a tier that cannot use a feature shows a dash, not a
 * check, without anyone having to remember to update this file.
 */
export const ComparisonTable = ({ tiers }: { tiers: PricingTier[] }) => {
  const groups = buildComparison(tiers);

  if (tiers.length === 0) return null;

  return (
    <section className="mx-auto max-w-[1240px] px-8 pt-18">
      <h2 className="font-display m-0 mb-5 text-[26px] font-bold leading-[1.12] tracking-[-0.028em] text-foreground md:text-[36px]">
        Compare plans
      </h2>

      {/* The matrix does not compress below ~900px, so it scrolls inside its own
          container rather than forcing the page to scroll sideways. */}
      <div className="overflow-x-auto rounded-xl bg-white shadow-[inset_0_0_0_1px_rgba(27,32,39,0.1),0_1px_2px_rgba(0,0,0,0.05)]">
        <table className="w-full min-w-[900px] border-collapse text-sm">
          <thead>
            <tr className="bg-muted">
              <th className="font-display border-b border-border px-5 py-3.5 text-left text-[13px] font-medium text-muted-foreground">
                Feature
              </th>
              {tiers.map((tier) => (
                <th
                  key={tier.id}
                  className={`font-display border-b border-border px-3 py-3.5 text-center text-[13px] font-medium ${
                    tier.featured ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  {tier.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {groups.map((group) => (
              <Fragment key={group.title}>
                <tr>
                  <td
                    colSpan={tiers.length + 1}
                    className="border-b border-border bg-accent px-5 py-2.75 text-[11.5px] font-semibold uppercase tracking-widest text-primary"
                  >
                    {group.title}
                  </td>
                </tr>
                {group.rows.map((row) => (
                  <tr key={`${group.title}-${row.label}`}>
                    <td className="border-b border-ru-n-100 px-5 py-3.25 text-secondary-foreground">
                      {row.label}
                    </td>
                    {row.cells.map((cell, index) => (
                      <td
                        key={`${row.label}-${index}`}
                        className="border-b border-ru-n-100 px-3 py-3.25 text-center text-muted-foreground"
                      >
                        {cell === true ? (
                          <>
                            <svg
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2.6"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              className="mx-auto text-ru-green-600"
                              aria-hidden
                            >
                              <path d="M20 6L9 17l-5-5" />
                            </svg>
                            <span className="sr-only">Included</span>
                          </>
                        ) : cell ? (
                          cell
                        ) : (
                          <>
                            <span aria-hidden className="text-ru-n-400">
                              —
                            </span>
                            <span className="sr-only">Not included</span>
                          </>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
};
