import { Image } from "@unpic/react";

import { imagesPath } from "@/utils/constants";

import { TRUSTED_BY } from "./ProductClosing";

const logos = Array.from({ length: 14 }, (_, i) => `${imagesPath}/homepage/CLIENTS/${i + 1}.png`);

/** The client-logo marquee, under the product's one social-proof line. */
export default function LogoStrip() {
  return (
    <section className="border-b border-ru-n-100 bg-white">
      <div className="mx-auto max-w-280 px-5 py-9 sm:py-12">
        <p className="mb-6 text-center font-display text-[clamp(1.125rem,2.2vw,1.4375rem)] font-semibold tracking-[-0.02em] text-ru-n-600">
          {TRUSTED_BY}
        </p>
        <div className="overflow-hidden py-1 mask-[linear-gradient(90deg,transparent,#000_6%,#000_94%,transparent)]">
          {/* Two copies of the rail, so the -50% lap in `ru-marquee` is seamless. */}
          <div className="flex w-max animate-ru-marquee items-stretch gap-3.5 pr-3.5 hover:paused motion-reduce:animate-none">
            {[...logos, ...logos].map((logo, i) => (
              <div
                key={i}
                className="flex h-16 min-w-40 items-center justify-center rounded-xl border border-ru-n-200 bg-ru-n-50 px-6"
              >
                <Image
                  src={logo}
                  width={120}
                  height={40}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className="h-10 w-auto object-contain opacity-55 grayscale"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
