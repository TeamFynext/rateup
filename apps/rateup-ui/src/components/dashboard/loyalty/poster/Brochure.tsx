import { forwardRef } from "react";
import { useTranslation } from "react-i18next";

import { RateupMark } from "@/components/brand/RateupMark.tsx";

import { formatMoney } from "../giveback/format.ts";
import type { BrochureRow, BrochureTier } from "../materials/materials.ts";
import { initialsOf, readableTextOn } from "../onboarding/brand.ts";

export type { BrochureRow } from "../materials/materials.ts";

export interface BrochureProps {
  /** Six-digit hex. Used for the header band and every accent; the body stays paper-white. */
  brandColor: string;
  logoUrl?: string | null;
  heroImageUrl?: string | null;
  title: string;
  /** The business behind the programme, set small above the title when it differs. */
  businessName?: string | null;
  tagline: string;
  /** "₹1 spent = 1 point" — blank hides the line. */
  earnLine: string;
  /** Beside each points figure: "PTS", or the merchant's own unit. */
  pointsLabel: string;
  rows: readonly BrochureRow[];
  /** Tiers above the base, lowest first — the order the tier sections print in. */
  tiers?: readonly BrochureTier[];
  /** For the "spend ₹5,000 within 6 months" condition under each tier. */
  currencyCode: string;
  currencySymbol: string;
  /** Months of spend that count towards a tier; null = lifetime. */
  qualificationWindowMonths: number | null;
  terms: string;
  showPoweredBy: boolean;
  /** Swap remote images for initials (export retry after a CORS refusal). */
  exportSafe?: boolean;
}

/** Print ink on the paper body — fixed, since print media is not themed. */
const INK = "#0f2540";
const INK_MUTED = "rgba(15,37,64,0.62)";
const RULE = "rgba(15,37,64,0.18)";

/**
 * The table-top rewards brochure, set like a menu card: a slim header band in the brand
 * colour carrying the logo and names, a paper-white body, the earn rate as a stamped
 * pill, and every reward as a menu line — what you get on the left, a dotted leader, the
 * points on the right in the brand colour. Rewards a tier unlocks sit under a labelled
 * rule in that tier's colour. Print media, so it is not themed and the merchant's colours
 * are data, hence `style`.
 */
export const Brochure = forwardRef<HTMLDivElement, BrochureProps>(function Brochure(
  {
    brandColor,
    logoUrl,
    heroImageUrl,
    title,
    businessName,
    tagline,
    earnLine,
    pointsLabel,
    rows,
    tiers = [],
    currencyCode,
    currencySymbol,
    qualificationWindowMonths,
    terms,
    showPoweredBy,
    exportSafe = false,
  },
  ref,
) {
  const { t } = useTranslation();

  /** How a customer reaches a tier, as the card states it under that tier's rewards. */
  const conditionFor = (tier: BrochureTier) => {
    const amount = formatMoney(tier.threshold, currencyCode, currencySymbol);
    if (qualificationWindowMonths === null) {
      return t("Spend {amount} in total to reach {name}", { amount, name: tier.name });
    }
    return qualificationWindowMonths === 1
      ? t("Spend {amount} within a month to reach {name}", { amount, name: tier.name })
      : t("Spend {amount} within {months} months to reach {name}", {
          amount,
          months: String(qualificationWindowMonths),
          name: tier.name,
        });
  };
  const bandInk = readableTextOn(brandColor);
  const hero = exportSafe ? null : heroImageUrl || null;
  const logo = exportSafe ? null : logoUrl || null;
  const business =
    businessName?.trim() && businessName.trim() !== title.trim() ? businessName : null;

  const forEveryone = rows.filter((row) => row.tier === null);
  const sections = tiers
    .map((tier) => ({ tier, rows: rows.filter((row) => row.tier?.id === tier.id) }))
    .filter((section) => section.rows.length > 0);

  return (
    <div
      ref={ref}
      className="flex w-[360px] flex-col overflow-hidden rounded-[14px] shadow-md"
      style={{ backgroundColor: "#fffdf8", color: INK }}
    >
      {/* Header band: logo, who, what */}
      <div
        className="flex items-center gap-3.5 px-6 py-5"
        style={{ backgroundColor: brandColor, color: bandInk }}
      >
        <div
          className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-xl text-lg font-bold"
          style={{ backgroundColor: "#fffdf8", color: brandColor }}
        >
          {logo ? (
            <img src={logo} alt="" crossOrigin="anonymous" className="size-full object-cover" />
          ) : (
            initialsOf(business ?? title)
          )}
        </div>
        <div className="min-w-0">
          {business && (
            <p className="truncate text-[11px] font-semibold tracking-[0.18em] uppercase opacity-80">
              {business}
            </p>
          )}
          <h2 className="font-display text-[24px] leading-[1.05] font-bold">{title}</h2>
          {tagline && <p className="mt-1 text-[13px] leading-snug opacity-90">{tagline}</p>}
        </div>
      </div>

      {/* A slim photo strip under the band, only when there is a photo */}
      {hero && (
        <div className="h-[84px] overflow-hidden">
          <img src={hero} alt="" crossOrigin="anonymous" className="size-full object-cover" />
        </div>
      )}

      {/* Body */}
      <div className="flex flex-col px-6 pt-5 pb-5">
        {earnLine && (
          <div className="flex items-center gap-3">
            <span
              className="rounded-full border-2 px-3.5 py-1 text-[14px] font-bold tracking-tight"
              style={{ borderColor: brandColor, color: brandColor }}
            >
              {earnLine}
            </span>
            <span className="text-[11px] leading-tight" style={{ color: INK_MUTED }}>
              {t("on every purchase")}
            </span>
          </div>
        )}

        {forEveryone.length > 0 && (
          <MenuSection
            label={sections.length > 0 ? t("For every member") : t("Rewards")}
            color={INK_MUTED}
            rows={forEveryone}
            accent={brandColor}
            pointsLabel={pointsLabel}
          />
        )}

        {sections.map(({ tier, rows: tierRows }) => (
          <MenuSection
            key={tier.id}
            label={t("{name} members and above", { name: tier.name })}
            condition={conditionFor(tier)}
            color={tier.color}
            rows={tierRows}
            accent={brandColor}
            pointsLabel={pointsLabel}
            swatch
          />
        ))}

        {rows.length === 0 && (
          <p className="mt-5 text-[13px]" style={{ color: INK_MUTED }}>
            {t("Rewards you tick on the left appear here.")}
          </p>
        )}

        {terms && (
          <p
            className="mt-6 text-[10px] leading-snug whitespace-pre-line"
            style={{ color: INK_MUTED }}
          >
            <span className="font-semibold">{t("Terms & Conditions")}. </span>
            {terms}
          </p>
        )}

        {showPoweredBy && (
          <div
            className="mt-4 flex items-center justify-center gap-1.5 pt-3 text-[10px]"
            style={{ borderTop: `1px solid ${RULE}`, color: INK_MUTED }}
          >
            <span>{t("powered by")}</span>
            <RateupMark size={13} />
            <span className="font-display text-[11px] font-extrabold tracking-tight lowercase">
              rateup.app
            </span>
          </div>
        )}
      </div>
    </div>
  );
});

/** One labelled run of menu lines: a small caps label on a rule, how to get there, then the rows. */
function MenuSection({
  label,
  condition,
  color,
  rows,
  accent,
  pointsLabel,
  swatch = false,
}: Readonly<{
  label: string;
  /** Under the label: what it takes to be in this band. */
  condition?: string;
  color: string;
  rows: readonly BrochureRow[];
  accent: string;
  pointsLabel: string;
  swatch?: boolean;
}>) {
  return (
    <section className="mt-5">
      <div className="flex items-center gap-2">
        {swatch && (
          <span aria-hidden className="size-2.5 rounded-full" style={{ backgroundColor: color }} />
        )}
        <p
          className="text-[10.5px] font-bold tracking-[0.16em] uppercase"
          style={{ color: swatch ? color : INK_MUTED }}
        >
          {label}
        </p>
        <span aria-hidden className="h-px flex-1" style={{ backgroundColor: RULE }} />
      </div>
      {condition && (
        <p className="mt-1 text-[11px] leading-snug italic" style={{ color: INK_MUTED }}>
          {condition}
        </p>
      )}
      <ul className="mt-2 flex flex-col gap-2">
        {rows.map((row, index) => (
          <li key={`${row.points}-${index}`} className="flex items-baseline gap-2">
            <p className="min-w-0 text-[14px] leading-snug">{row.blurb}</p>
            {/* The dotted leader that walks the eye from the line to its price. */}
            <span
              aria-hidden
              className="mb-[3px] min-w-3 flex-1 border-b border-dotted"
              style={{ borderColor: RULE }}
            />
            <p className="shrink-0 text-right leading-none">
              <span className="text-[17px] font-bold" style={{ color: accent }}>
                {row.points.toLocaleString()}
              </span>
              <span
                className="ml-1 text-[9px] font-semibold tracking-wider uppercase"
                style={{ color: INK_MUTED }}
              >
                {pointsLabel}
              </span>
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
