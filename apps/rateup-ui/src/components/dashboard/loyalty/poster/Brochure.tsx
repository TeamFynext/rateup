import { forwardRef } from "react";
import { useTranslation } from "react-i18next";

import { RateupMark } from "@/components/brand/RateupMark.tsx";

import { formatMoney } from "../giveback/format.ts";
import { QR_PLACEMENT, type BrochureDesignKind } from "../materials/brochureDesigns.ts";
import { mixHex, brochureTones, type PaperTones } from "../materials/brochurePapers.ts";
import type { BrochureRow, BrochureTier } from "../materials/materials.ts";
import { initialsOf, readableTextOn } from "../onboarding/brand.ts";

export type { BrochureRow } from "../materials/materials.ts";

export interface BrochureProps {
  /** Which of the four layouts prints. */
  design: BrochureDesignKind;
  /** Paper and ink together. */
  /** Six-digit hex. The card's background; its ink and accent are derived from it. */
  background: string;
  /** Six-digit hex. The band, the accents, and the tint the brand paper is mixed from. */
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
  /** The join QR, already rendered. Null hides the block even when `showQr` is on. */
  qrDataUrl?: string | null;
  showQr?: boolean;
  /** What a customer can text instead of scanning. */
  joinKeyword?: string;
  /** Swap remote images for initials (export retry after a CORS refusal). */
  exportSafe?: boolean;
}

/**
 * The rewards brochure, in one of four designs.
 *
 * Every design says the same things — the programme's name, its earn rate, its rewards by
 * tier, its terms — and differs only in how they are set, so switching design never costs
 * the merchant their copy. Paper and ink come from the chosen preset as a pair (see
 * `brochurePapers.ts`), which is what keeps a dark paper from being handed dark text.
 *
 * The rateup.app footer prints on every design and is not optional.
 *
 * Print media, so nothing is themed and the merchant's colours are data — hence `style`
 * rather than classes for anything that comes from the programme.
 */
export const Brochure = forwardRef<HTMLDivElement, BrochureProps>(function Brochure(
  {
    design,
    background,
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
    qrDataUrl = null,
    showQr = false,
    joinKeyword,
    exportSafe = false,
  },
  ref,
) {
  const { t } = useTranslation();
  const tones = brochureTones(background, brandColor);

  /** How a customer reaches a tier, as the card states it under that tier's rewards. */
  const conditionFor = (tier: BrochureTier): string => {
    const spend = formatMoney(tier.threshold, currencyCode, currencySymbol);
    return qualificationWindowMonths === null
      ? t("{spend} spent in total", { spend })
      : t("{spend} within {months} months", {
          spend,
          months: String(qualificationWindowMonths),
        });
  };

  const hero = exportSafe ? null : heroImageUrl || null;
  const logo = exportSafe ? null : logoUrl || null;
  const business =
    businessName?.trim() && businessName.trim() !== title.trim() ? businessName : null;

  const forEveryone = rows.filter((row) => row.tier === null);
  const sections = tiers
    .map((tier) => ({ tier, rows: rows.filter((row) => row.tier?.id === tier.id) }))
    .filter((section) => section.rows.length > 0);

  const qr = showQr && qrDataUrl ? qrDataUrl : null;
  const placement = QR_PLACEMENT[design];

  const body = (
    <>
      {forEveryone.length > 0 && (
        <MenuSection
          label={sections.length > 0 ? t("For every member") : t("Rewards")}
          color={tones.inkMuted}
          rows={forEveryone}
          tones={tones}
          pointsLabel={pointsLabel}
          columns={design === "tent" ? 2 : 1}
        />
      )}

      {sections.map(({ tier, rows: tierRows }) => (
        <MenuSection
          key={tier.id}
          label={t("{name} members and above", { name: tier.name })}
          condition={conditionFor(tier)}
          color={tier.color}
          rows={tierRows}
          tones={tones}
          pointsLabel={pointsLabel}
          columns={design === "tent" ? 2 : 1}
          swatch
        />
      ))}

      {rows.length === 0 && (
        <p className="mt-5 text-[13px]" style={{ color: tones.inkMuted }}>
          {t("Rewards you tick on the left appear here.")}
        </p>
      )}
    </>
  );

  const footer = (
    <>
      {terms && (
        <p
          className="mt-6 text-[10px] leading-snug whitespace-pre-line"
          style={{ color: tones.inkMuted }}
        >
          <span className="font-semibold">{t("Terms & Conditions")}. </span>
          {terms}
        </p>
      )}

      {qr && placement === "footer" && <QrFooter qr={qr} tones={tones} joinKeyword={joinKeyword} />}

      <PoweredBy tones={tones} />
    </>
  );

  const shared = {
    tones,
    brandColor,
    logo,
    hero,
    business,
    title,
    tagline,
    earnLine,
    body,
    footer,
    qr,
    placement,
    joinKeyword,
  };

  return (
    <div
      ref={ref}
      className="flex w-[360px] flex-col overflow-hidden rounded-[14px] shadow-md"
      style={{ backgroundColor: tones.paper, color: tones.ink }}
    >
      {design === "poster" && <PosterLayout {...shared} />}
      {design === "tent" && <TentLayout {...shared} />}
      {design === "typeset" && <TypesetLayout {...shared} />}
      {design === "menu" && <MenuLayout {...shared} />}
    </div>
  );
});

/* ── the four layouts ───────────────────────────────────────────────────────── */

interface LayoutProps {
  tones: PaperTones;
  brandColor: string;
  logo: string | null;
  hero: string | null;
  business: string | null;
  title: string;
  tagline: string;
  earnLine: string;
  body: React.ReactNode;
  footer: React.ReactNode;
  qr: string | null;
  placement: "footer" | "feature";
  joinKeyword?: string;
}

/** The original: a slim brand band over a paper body, handed to a customer at the table. */
function MenuLayout({
  tones,
  brandColor,
  logo,
  hero,
  business,
  title,
  tagline,
  earnLine,
  body,
  footer,
}: Readonly<LayoutProps>) {
  const { t } = useTranslation();
  // Over a photo the type is always light, on a scrim built for it; over the flat brand
  // colour it is whichever of the two inks that colour can carry.
  const bandInk = hero ? "#fffdf8" : readableTextOn(brandColor);

  return (
    <>
      {/* The hero sits *behind* the band rather than in a strip under it: one top section,
          the photo as its background, the name and tagline on top. Without a photo the
          same block is the flat brand colour it always was. */}
      <div
        className="relative flex items-center gap-3.5 px-6 py-5"
        // The brand colour is painted under the photo as well as instead of it: an image
        // the host refuses to serve then leaves a brand band, not a hole in the card.
        style={{ backgroundColor: brandColor, ...(hero ? {} : { color: bandInk }) }}
      >
        {hero && (
          <>
            <img
              src={hero}
              alt=""
              crossOrigin="anonymous"
              className="absolute inset-0 size-full object-cover"
            />
            {/* Dark enough to carry light type over any photo, and a plain rgba gradient
                because the export rasteriser cannot parse `color-mix()`. */}
            <div
              aria-hidden
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(to right, rgba(6,14,26,0.82), rgba(6,14,26,0.52) 70%, rgba(6,14,26,0.34))",
              }}
            />
          </>
        )}
        <div className="relative" style={hero ? { color: bandInk } : undefined}>
          <LogoChip logo={logo} fallback={business ?? title} bg={tones.paper} fg={brandColor} />
        </div>
        <div className="relative min-w-0" style={hero ? { color: bandInk } : undefined}>
          {business && <Eyebrow>{business}</Eyebrow>}
          <h2 className="font-display text-[24px] leading-[1.05] font-bold">{title}</h2>
          {tagline && <p className="mt-1 text-[13px] leading-snug opacity-90">{tagline}</p>}
        </div>
      </div>

      <div className="flex flex-col px-6 pt-5 pb-5">
        {earnLine && <EarnPill tones={tones} label={earnLine} note={t("on every purchase")} />}
        {body}
        {footer}
      </div>
    </>
  );
}

/** The photo leads. For a wall or a counter easel, read from a metre away. */
function PosterLayout({
  tones,
  brandColor,
  logo,
  hero,
  business,
  title,
  tagline,
  earnLine,
  body,
  footer,
}: Readonly<LayoutProps>) {
  return (
    <>
      {/* The hero takes the top third, with the title over a scrim so it stays readable
          whatever the photo is. Without a photo the same block becomes a brand panel. */}
      <div
        className="relative flex h-[188px] flex-col justify-end p-6"
        style={hero ? undefined : { backgroundColor: brandColor }}
      >
        {hero && (
          <>
            <img
              src={hero}
              alt=""
              crossOrigin="anonymous"
              className="absolute inset-0 size-full object-cover"
            />
            <div
              aria-hidden
              className="absolute inset-0"
              style={{
                background: "linear-gradient(to top, rgba(6,14,26,0.86) 12%, rgba(6,14,26,0.12))",
              }}
            />
          </>
        )}
        <div
          className="relative min-w-0"
          style={{ color: hero ? "#fffdf8" : readableTextOn(brandColor) }}
        >
          {business && <Eyebrow>{business}</Eyebrow>}
          <h2 className="font-display text-[30px] leading-[1.02] font-bold">{title}</h2>
          {tagline && <p className="mt-1.5 text-[13px] leading-snug opacity-90">{tagline}</p>}
        </div>
        {logo && (
          <div className="absolute top-5 right-5">
            <LogoChip logo={logo} fallback={title} bg={tones.paper} fg={brandColor} size={44} />
          </div>
        )}
      </div>

      <div className="flex flex-col px-6 pt-5 pb-5">
        {earnLine && <BigEarnLine tones={tones} label={earnLine} />}
        {body}
        {footer}
      </div>
    </>
  );
}

/** Short and square, rewards in two columns, the code given room. */
function TentLayout({
  tones,
  brandColor,
  logo,
  business,
  title,
  earnLine,
  body,
  footer,
  qr,
  placement,
  joinKeyword,
}: Readonly<LayoutProps>) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col px-6 pt-6 pb-5">
      <div className="flex items-center gap-3">
        <LogoChip
          logo={logo}
          fallback={business ?? title}
          bg={brandColor}
          fg={tones.paper}
          size={38}
        />
        <div className="min-w-0">
          <h2 className="font-display truncate text-[20px] leading-tight font-bold">{title}</h2>
          {earnLine && (
            <p className="text-[12px] font-semibold" style={{ color: tones.accent }}>
              {earnLine}
            </p>
          )}
        </div>
      </div>

      <div className="mt-1">{body}</div>

      {/* The scan is the whole point of a tent card, so it gets a panel rather than a line. */}
      {qr && placement === "feature" && (
        <div
          className="mt-5 flex items-center gap-4 rounded-xl p-3.5"
          // Mixed towards the paper rather than `color-mix(… transparent)`: the export
          // rasteriser cannot parse that function, so the panel would download untinted.
          style={{ backgroundColor: mixHex(brandColor, tones.paper, 0.08) }}
        >
          <img
            src={qr}
            alt={t("Scan to join")}
            className="size-[92px] shrink-0 rounded-lg bg-white p-1.5"
          />
          <div className="min-w-0">
            <p className="text-[15px] leading-tight font-bold" style={{ color: tones.accent }}>
              {t("Scan to join")}
            </p>
            <p className="mt-1 text-[11px] leading-snug" style={{ color: tones.inkMuted }}>
              {joinKeyword ? (
                <>
                  {t("Or send us this on WhatsApp:")}{" "}
                  <span className="font-semibold">{joinKeyword}</span>
                </>
              ) : (
                t("It opens a WhatsApp chat with us.")
              )}
            </p>
          </div>
        </div>
      )}

      {footer}
    </div>
  );
}

/** No colour band — the brand carried by type and rules alone. */
function TypesetLayout({
  tones,
  business,
  title,
  tagline,
  earnLine,
  body,
  footer,
}: Readonly<LayoutProps>) {
  return (
    <div className="flex flex-col px-7 pt-8 pb-6">
      <div className="text-center">
        {business && <Eyebrow center>{business}</Eyebrow>}
        {/* Letter-spaced caps carry the brand where a colour block would have. */}
        <h2
          className="font-display text-[24px] leading-tight font-bold tracking-[0.14em] uppercase"
          style={{ color: tones.accent }}
        >
          {title}
        </h2>
        {tagline && (
          <p className="mt-2 text-[12.5px] leading-snug" style={{ color: tones.inkMuted }}>
            {tagline}
          </p>
        )}
        <span
          aria-hidden
          className="mx-auto mt-4 block h-px w-16"
          style={{ backgroundColor: tones.accent }}
        />
        {earnLine && (
          <p className="mt-4 text-[14px] font-semibold" style={{ color: tones.ink }}>
            {earnLine}
          </p>
        )}
      </div>

      {body}
      {footer}
    </div>
  );
}

/* ── shared pieces ──────────────────────────────────────────────────────────── */

function Eyebrow({
  children,
  center = false,
}: Readonly<{ children: React.ReactNode; center?: boolean }>) {
  return (
    <p
      className={`truncate text-[11px] font-semibold tracking-[0.18em] uppercase opacity-80 ${
        center ? "text-center" : ""
      }`}
    >
      {children}
    </p>
  );
}

function LogoChip({
  logo,
  fallback,
  bg,
  fg,
  size = 56,
}: Readonly<{ logo: string | null; fallback: string; bg: string; fg: string; size?: number }>) {
  return (
    <div
      className="flex shrink-0 items-center justify-center overflow-hidden rounded-xl text-lg font-bold"
      style={{ width: size, height: size, background: bg, color: fg }}
    >
      {logo ? (
        <img src={logo} alt="" crossOrigin="anonymous" className="size-full object-cover" />
      ) : (
        initialsOf(fallback)
      )}
    </div>
  );
}

/** The earn rate as a stamped pill — the menu card's own treatment. */
function EarnPill({
  tones,
  label,
  note,
}: Readonly<{ tones: PaperTones; label: string; note: string }>) {
  return (
    <div className="flex items-center gap-3">
      <span
        className="rounded-full border-2 px-3.5 py-1 text-[14px] font-bold tracking-tight"
        style={{ borderColor: tones.accent, color: tones.accent }}
      >
        {label}
      </span>
      <span className="text-[11px] leading-tight" style={{ color: tones.inkMuted }}>
        {note}
      </span>
    </div>
  );
}

/** The poster's earn rate: set large, because it is read from across the room. */
function BigEarnLine({ tones, label }: Readonly<{ tones: PaperTones; label: string }>) {
  return (
    <p className="font-display text-[19px] leading-tight font-bold" style={{ color: tones.accent }}>
      {label}
    </p>
  );
}

function QrFooter({
  qr,
  tones,
  joinKeyword,
}: Readonly<{ qr: string; tones: PaperTones; joinKeyword?: string }>) {
  const { t } = useTranslation();
  return (
    <div
      className="mt-5 flex items-center gap-3.5 pt-4"
      style={{ borderTop: `1px solid ${tones.rule}` }}
    >
      <img
        src={qr}
        alt={t("Scan to join")}
        className="size-[68px] shrink-0 rounded-md bg-white p-1"
      />
      <div className="min-w-0">
        <p className="text-[13px] leading-tight font-bold" style={{ color: tones.accent }}>
          {t("Scan to join on WhatsApp")}
        </p>
        <p className="mt-0.5 text-[10.5px] leading-snug" style={{ color: tones.inkMuted }}>
          {joinKeyword ? (
            <>
              {t("Or send us:")} <span className="font-semibold">{joinKeyword}</span>
            </>
          ) : (
            t("It opens a chat with us.")
          )}
        </p>
      </div>
    </div>
  );
}

/** Prints on every design. Not a setting. */
function PoweredBy({ tones }: Readonly<{ tones: PaperTones }>) {
  const { t } = useTranslation();
  return (
    <div
      className="mt-4 flex items-center justify-center gap-1.5 pt-3 text-[10px]"
      style={{ borderTop: `1px solid ${tones.rule}`, color: tones.inkMuted }}
    >
      <span>{t("powered by")}</span>
      <RateupMark size={13} />
      <span className="font-display text-[11px] font-extrabold tracking-tight lowercase">
        rateup.app
      </span>
    </div>
  );
}

/** One labelled run of menu lines: a small caps label on a rule, how to get there, then the rows. */
function MenuSection({
  label,
  condition,
  color,
  rows,
  tones,
  pointsLabel,
  columns = 1,
  swatch = false,
}: Readonly<{
  label: string;
  /** Under the label: what it takes to be in this band. */
  condition?: string;
  color: string;
  rows: readonly BrochureRow[];
  tones: PaperTones;
  pointsLabel: string;
  /** Two columns on the table tent, so the card stays short. */
  columns?: 1 | 2;
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
          style={{ color: swatch ? color : tones.inkMuted }}
        >
          {label}
        </p>
        <span aria-hidden className="h-px flex-1" style={{ backgroundColor: tones.rule }} />
      </div>
      {condition && (
        <p className="mt-1 text-[11px] leading-snug italic" style={{ color: tones.inkMuted }}>
          {condition}
        </p>
      )}
      <ul
        className={`mt-2 ${columns === 2 ? "grid grid-cols-2 gap-x-4 gap-y-2" : "flex flex-col gap-2"}`}
      >
        {rows.map((row, index) => (
          <li key={`${row.points}-${index}`} className="flex items-baseline gap-2">
            <p className="min-w-0 text-[14px] leading-snug">{row.blurb}</p>
            {/* The dotted leader that walks the eye from the line to its price. */}
            <span
              aria-hidden
              className="mb-[3px] min-w-3 flex-1 border-b border-dotted"
              style={{ borderColor: tones.rule }}
            />
            <p className="shrink-0 text-right leading-none">
              <span className="text-[17px] font-bold" style={{ color: tones.accent }}>
                {row.points.toLocaleString()}
              </span>
              <span
                className="ml-1 text-[9px] font-semibold tracking-wider uppercase"
                style={{ color: tones.inkMuted }}
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
