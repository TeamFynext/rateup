import { Image } from "@unpic/react";

import { imagesPath } from "@/utils/constants";

const logos = Array.from({ length: 14 }, (_, i) => `${imagesPath}/homepage/CLIENTS/${i + 1}.png`);

const HAIRLINE = "h-px w-10 flex-none sm:w-20";

export default function TrustedBy() {
  return (
    <section id="trusted" className="bg-white">
      <div className="mx-auto max-w-280 px-5 pt-8 pb-8 sm:pt-12 sm:pb-12">
        <p className="mb-7 flex items-center justify-center gap-4 text-center font-display text-[clamp(1.0625rem,2vw,1.3125rem)]/[1.4] font-medium tracking-[-0.01em] text-ru-n-500 sm:mb-10 sm:gap-6">
          <span className={`${HAIRLINE} bg-linear-to-r from-transparent to-ru-n-200`} />
          <span className="text-balance">
            Trusted by <strong className="font-bold text-ru-n-700">100+ brands</strong> in{" "}
            <strong className="font-bold text-ru-n-700">10+ countries</strong>
          </span>
          <span className={`${HAIRLINE} bg-linear-to-l from-transparent to-ru-n-200`} />
        </p>

        <div className="overflow-hidden mask-[linear-gradient(90deg,transparent,#000_10%,#000_90%,transparent)]">
          {/* Two copies of the rail, so the -50% lap in `ru-marquee` is seamless. */}
          <ul className="flex w-max animate-ru-marquee list-none items-center p-0 hover:paused motion-reduce:animate-none">
            {[...logos, ...logos].map((logo, i) => (
              <li
                key={i}
                aria-hidden={i >= logos.length || undefined}
                className="flex h-20 w-40 flex-none items-center justify-center px-3 sm:h-24 sm:w-52 sm:px-4"
              >
                {/* Tall because every PNG sits on an 800px canvas with wide margins. Lazy: 28 eager
                    tags make React 19 preload every one and crowd out the hero. */}
                <Image
                  src={logo}
                  width={200}
                  height={96}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className="h-20 w-auto max-w-full object-contain opacity-75 grayscale transition duration-300 hover:opacity-100 hover:grayscale-0 sm:h-24"
                />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
