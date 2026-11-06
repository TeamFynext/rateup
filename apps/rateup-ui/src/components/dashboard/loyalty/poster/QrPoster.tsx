import { IconQrcode } from "@tabler/icons-react";
import { forwardRef } from "react";
import { useTranslation } from "react-i18next";

import { RateupMark } from "@/components/brand/RateupMark.tsx";

import { brandGradient, initialsOf, readableTextOn } from "../onboarding/brand.ts";

export interface QrPosterProps {
  venueName: string;
  programName: string;
  pointsName: string;
  /** Six-digit hex. */
  brandColor: string;
  logoUrl?: string | null;
  heroImageUrl?: string | null;
  /** Printed small under the code — the WhatsApp number the QR opens. */
  caption: string;
  /** The word the QR pre-types into the chat. */
  joinKeyword: string;
  /** The QR as a data URL, or null while it is being drawn. */
  qrDataUrl: string | null;
  /**
   * Swap remote images for the brand gradient and initials. Used on the export retry when
   * the image host refuses a cross-origin fetch — the poster still ships, just plainer.
   */
  exportSafe?: boolean;
  /* ── Materials page overrides; the defaults are what Launch and Settings print ── */
  /** Replaces "Scan to join {program} on WhatsApp". */
  headline?: string;
  /** Replaces "Earn {points} on every visit". */
  subline?: string;
  /** Replaces "Just send “{keyword}”". */
  footnote?: string;
  /** False paints the brand gradient instead of the hero photo. Default true. */
  showHero?: boolean;
}

/**
 * The counter card: A6 in proportion, white, brand band on top, the QR in the middle,
 * "powered by rateup.app" at the foot. Deliberately not themed — it is printed, so it is
 * always the same colours whatever the dashboard is set to. The merchant's colour is data,
 * hence the `style` props.
 */
export const QrPoster = forwardRef<HTMLDivElement, QrPosterProps>(function QrPoster(
  {
    venueName,
    programName,
    pointsName,
    brandColor,
    logoUrl,
    heroImageUrl,
    caption,
    joinKeyword,
    qrDataUrl,
    exportSafe = false,
    headline,
    subline,
    footnote,
    showHero = true,
  },
  ref,
) {
  const { t } = useTranslation();
  const ink = readableTextOn(brandColor);
  const hero = exportSafe || !showHero ? null : heroImageUrl || null;
  const logo = exportSafe ? null : logoUrl || null;

  return (
    <div
      ref={ref}
      className="flex h-[595px] w-[420px] flex-col overflow-hidden rounded-2xl bg-white text-ru-n-700 shadow-md"
    >
      {/* Band */}
      <div
        className="relative h-[168px] shrink-0 bg-cover bg-center"
        style={
          hero
            ? { backgroundImage: `url(${hero})`, backgroundColor: brandColor }
            : { background: brandGradient(brandColor) }
        }
      >
        {hero && (
          <img
            src={hero}
            alt=""
            crossOrigin="anonymous"
            className="absolute inset-0 size-full object-cover"
          />
        )}
        <div
          className="absolute -bottom-9 left-1/2 flex size-[72px] -translate-x-1/2 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-white text-xl font-bold shadow-md"
          style={{ color: brandColor }}
        >
          {logo ? (
            <img src={logo} alt="" crossOrigin="anonymous" className="size-full object-cover" />
          ) : (
            initialsOf(venueName)
          )}
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col items-center px-8 pt-12 pb-5 text-center">
        <p className="font-display text-[22px] leading-tight font-extrabold text-ru-n-700">
          {venueName}
        </p>
        <p className="mt-1 text-[13px] text-ru-n-500">
          {headline || t("Scan to join {program} on WhatsApp", { program: programName })}
        </p>
        <p
          className="mt-2 inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold"
          style={{ backgroundColor: brandColor, color: ink }}
        >
          {subline || t("Earn {points} on every visit", { points: pointsName })}
        </p>

        <div className="mt-5 flex size-[228px] items-center justify-center rounded-xl border border-ru-n-200 bg-white p-2 shadow-sm">
          {qrDataUrl ? (
            <img src={qrDataUrl} alt={t("QR code to join")} className="size-full" />
          ) : (
            <IconQrcode size={64} className="text-ru-n-300" />
          )}
        </div>
        <p className="mt-2 text-[11px] text-ru-n-500">
          {footnote || t("Just send “{keyword}”", { keyword: joinKeyword })}
        </p>
        <p className="mt-0.5 max-w-full truncate font-mono text-[10px] text-ru-n-400">{caption}</p>
      </div>

      {/* Footer */}
      <div className="flex shrink-0 items-center justify-center gap-1.5 border-t border-ru-n-100 py-3 text-[11px] text-ru-n-500">
        <span>{t("powered by")}</span>
        <RateupMark size={16} />
        <span className="font-display text-[13px] font-extrabold tracking-tight text-ru-blue-600 lowercase">
          rateup.app
        </span>
      </div>
    </div>
  );
});
