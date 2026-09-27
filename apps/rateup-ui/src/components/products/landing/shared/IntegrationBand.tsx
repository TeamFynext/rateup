import type { ReactNode } from "react";

import { IntegrationTiles } from "@/components/RateupHomePage/shared/Integrations";
import { INTEGRATIONS } from "@/config/integrations";

import { BAND, SectionHead } from "./section";

export interface IntegrationPoint {
  name: string;
  body: string;
  /** Takes the partner's logo from `config/integrations.ts`. */
  slug?: string;
  /** A mark for partners that have no entry there, drawn on a neutral tile. */
  mark?: ReactNode;
}

/** What this product does with each integration, above the site-wide integration tiles. */
export default function IntegrationBand({
  title,
  lead,
  points,
}: Readonly<{ title: ReactNode; lead?: ReactNode; points: readonly IntegrationPoint[] }>) {
  return (
    <section id="integrations" className="bg-white">
      <div className={BAND}>
        <SectionHead
          eyebrow="Integrations"
          icon={
            <>
              <path d="M9 3v5M15 3v5M12 17v4" />
              <path d="M6 8h12v3a6 6 0 0 1-6 6 6 6 0 0 1-6-6V8Z" />
            </>
          }
          title={title}
        >
          {lead}
        </SectionHead>

        <div className="mb-3 grid gap-3 md:grid-cols-2">
          {points.map((point) => {
            const logo = point.slug
              ? INTEGRATIONS.find((intg) => intg.slug === point.slug)?.logo
              : null;
            return (
              <div
                key={point.name}
                className="flex items-start gap-3.5 rounded-2xl border border-ru-n-200 bg-ru-n-50 p-5"
              >
                <span className="flex size-11 flex-none items-center justify-center rounded-xl border border-ru-n-200 bg-white text-ru-n-600">
                  {logo ? (
                    <img src={logo} alt="" loading="lazy" className="size-7 object-contain" />
                  ) : (
                    point.mark
                  )}
                </span>
                <div className="min-w-0">
                  <h3 className="text-base font-semibold text-ru-n-700">{point.name}</h3>
                  <p className="mt-0.5 text-[14.5px]/[1.5] text-ru-n-500">{point.body}</p>
                </div>
              </div>
            );
          })}
        </div>

        <IntegrationTiles />
      </div>
    </section>
  );
}
