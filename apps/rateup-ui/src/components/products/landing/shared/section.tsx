import type { ReactNode } from "react";

import { Eyebrow } from "@/components/RateupHomePage/shared/home-ui";

export function Glyph({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-4"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

/** Centred eyebrow + H2 + optional lead, as every band on the page opens. */
export function SectionHead({
  eyebrow,
  icon,
  title,
  children,
}: Readonly<{ eyebrow: string; icon: ReactNode; title: ReactNode; children?: ReactNode }>) {
  return (
    <div className="mx-auto mb-8 max-w-180 text-center sm:mb-12">
      <Eyebrow className="mb-4.5" icon={<Glyph>{icon}</Glyph>}>
        {eyebrow}
      </Eyebrow>
      <h2 className="font-display text-[clamp(2rem,5vw,3.25rem)]/[1.08] font-bold tracking-[-0.03em] text-balance text-ru-n-700">
        {title}
      </h2>
      {children && (
        <p className="mt-4 text-[clamp(1.0625rem,2vw,1.25rem)]/[1.6] text-pretty text-ru-n-500">
          {children}
        </p>
      )}
    </div>
  );
}

export const BAND = "mx-auto max-w-280 px-5 py-14 sm:py-24";
