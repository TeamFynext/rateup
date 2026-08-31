import { buildComparison, type PricingTier } from "./pricing.data.ts";

/**
 * The full feature matrix, derived from each plan's own `features` JSON — the same blob
 * the API enforces against — so a tier that cannot use a feature shows a dash, not a
 * check, without anyone having to remember to update this file.
 */
export const ComparisonTable = ({ tiers }: { tiers: PricingTier[] }) => {
  const groups = buildComparison(tiers);
  // The column template is driven by however many tiers the catalog returns.
  const grid = { gridTemplateColumns: `2.2fr repeat(${tiers.length}, 1fr)` };

  if (tiers.length === 0) return null;

  return (
    <section className="mx-auto max-w-[1240px] px-8 pt-24">
      <div className="mb-10 text-center">
        <div className="mb-3 text-xs font-bold uppercase tracking-[0.14em] text-primary">
          Compare plans
        </div>
        <h2 className="font-nunito m-0 text-[40px] font-extrabold tracking-[-0.02em] text-foreground">
          Every feature, side by side.
        </h2>
      </div>

      {/* The matrix does not compress below ~900px, so it scrolls inside its own
        container rather than forcing the page to scroll sideways. */}
      <div className="overflow-x-auto rounded-xl">
        <div className="min-w-[900px] overflow-hidden rounded-xl border border-border bg-white shadow-[0_1px_2px_rgba(11,31,72,0.06),0_8px_24px_rgba(11,31,72,0.06)]">
          <div className="grid border-b border-border bg-background" style={grid}>
            <div className="px-6 py-[18px] text-xs font-bold uppercase tracking-[0.08em] text-muted-foreground">
              Feature
            </div>
            {tiers.map((tier) => (
              <div
                key={tier.id}
                className={`font-nunito px-4 py-[18px] text-base font-extrabold ${
                  tier.featured ? "text-primary" : "text-foreground"
                }`}
              >
                {tier.name}
              </div>
            ))}
          </div>

          {groups.map((group) => (
            <div key={group.title}>
              <div className="bg-accent px-6 py-3.5 text-[11px] font-extrabold uppercase tracking-[0.1em] text-primary">
                {group.title}
              </div>
              {group.rows.map((row) => (
                <div
                  key={row.label}
                  className="grid items-center border-b border-ru-n-50 last:border-b-0"
                  style={grid}
                >
                  <div className="px-6 py-4 text-sm font-medium text-foreground">{row.label}</div>
                  {row.cells.map((cell, index) => (
                    <div
                      key={`${row.label}-${index}`}
                      className={
                        cell === true
                          ? "px-4 py-4 text-[15px] font-bold text-primary"
                          : "px-4 py-4 text-sm text-muted-foreground"
                      }
                    >
                      {cell === true ? (
                        <>
                          <span aria-hidden>✓</span>
                          <span className="sr-only">Included</span>
                        </>
                      ) : cell ? (
                        cell
                      ) : (
                        <>
                          <span aria-hidden className="text-ru-n-300">
                            —
                          </span>
                          <span className="sr-only">Not included</span>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
