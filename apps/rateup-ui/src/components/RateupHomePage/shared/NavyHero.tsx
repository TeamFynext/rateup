import type { ReactNode } from "react";

import HeroBackground from "./hero-bg/HeroBackground";
import { BookDemoCta, WhatsAppCta } from "./home-ui";
import ProductVideoModal from "./ProductVideoModal";

export const HERO_H1 =
  "mb-5.5 font-display text-[clamp(2.5rem,7.2vw,5.25rem)]/[1.05] font-bold tracking-[-0.035em] text-balance text-white";

export const HERO_SUB =
  "mx-auto mb-8 font-display text-[clamp(1.3125rem,2.9vw,1.8125rem)]/[1.35] font-semibold tracking-[-0.02em] text-white/72 sm:mb-10";

/** The navy line-field hero band the homepage and the product landings open on. */
export function NavyHero({ children }: Readonly<{ children: ReactNode }>) {
  /* The negative top margin pulls the band up under the sticky nav — a floating pill in a
     header that paints no background of its own — so the navy runs to the top of the page and
     reads behind the pill. The padding-top adds that height back.

     The pull has to equal the header's full height or a strip of page ground shows above it:
     wrapper `py-2`/`sm:py-4` + pill `py-2`/`sm:py-2.5` + the tallest child (the `h-11.5` CTA
     at 46px, then the `sm:h-12` logo at 48px) + the pill's two 1px borders = 80px, then 102px
     from `sm`. Revisit these two if the navbar's height changes. */
  return (
    <section className="relative isolate -mt-20 flex min-h-[min(92svh,52rem)] flex-col justify-center overflow-hidden bg-[linear-gradient(160deg,var(--color-ru-blue-800)_0%,var(--color-ru-blue-900)_46%,var(--color-ru-blue-950)_100%)] px-5 pt-27 pb-20 sm:-mt-25.5 sm:pt-37.5 sm:pb-28">
      <HeroBackground className="-z-10" />
      <div className="mx-auto max-w-230 text-center">{children}</div>
    </section>
  );
}

/** The video pill with the demo and WhatsApp pair beneath it. */
export function HeroActions() {
  return (
    <>
      <ProductVideoModal />

      {/* Equal widths, so the pair mirrors about the same centre line as the pill above. */}
      <div className="mx-auto mt-5 grid w-full max-w-104 grid-cols-2 gap-3 sm:mt-6">
        <BookDemoCta
          onDark
          className="w-full justify-center rounded-full! px-0! max-sm:gap-1.5 max-sm:text-[15.5px]"
        />
        <WhatsAppCta
          onDark
          className="w-full justify-center rounded-full! px-0! max-sm:gap-2 max-sm:text-[15.5px]"
        >
          Chat with us
        </WhatsAppCta>
      </div>
    </>
  );
}
