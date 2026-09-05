import { useState } from "react";

import { rateupLogoWhite, rateupProductVideo } from "@/utils/constants";

/**
 * The 90-second product film, as a click-to-play facade.
 *
 * The film is self-hosted on the CloudFront bucket, so nothing about this band is fetched
 * until someone asks for it: the facade is the design's gradient panel, and the `<video>`
 * element — with it, the megabytes — only mounts on the click. `preload="none"` keeps a
 * second visit from fetching ahead of that click either.
 */
interface ProductVideoProps {
  /** Overrides the bucket film, mostly so the band can be previewed against another cut. */
  src?: string | null;
}

export default function ProductVideo({ src = rateupProductVideo }: Readonly<ProductVideoProps>) {
  const [playing, setPlaying] = useState(false);

  if (!src) return null;

  return (
    <section className="bg-ink-25 px-5 pb-12 sm:pb-20">
      <div className="mx-auto max-w-250">
        <div className="relative aspect-video overflow-hidden rounded-2xl border border-white/8 bg-[linear-gradient(148deg,#164070_0%,#0F2540_46%,#091729_100%)] shadow-[0_24px_64px_rgba(16,24,40,0.1)]">
          {playing ? (
            /* No `<track>`: no caption file has been cut for the film yet. Add one beside
               the mp4 in the bucket and it belongs here. */
            <video
              src={src}
              title="RateUp product tour"
              autoPlay
              controls
              playsInline
              preload="none"
              className="absolute inset-0 size-full bg-black object-contain"
            />
          ) : (
            <button
              type="button"
              onClick={() => setPlaying(true)}
              aria-label="Play the RateUp product tour"
              className="absolute inset-0 flex size-full cursor-pointer items-center justify-center border-0 bg-transparent"
            >
              <span className="absolute inset-0 bg-[repeating-linear-gradient(90deg,rgba(47,163,255,0.06)_0_1px,transparent_1px_64px),repeating-linear-gradient(0deg,rgba(47,163,255,0.06)_0_1px,transparent_1px_64px)]" />
              <span className="absolute aspect-square w-[70%] rounded-full bg-[radial-gradient(circle,rgba(47,163,255,0.16)_0%,transparent_62%)]" />

              <img
                src={rateupLogoWhite}
                alt=""
                loading="lazy"
                decoding="async"
                className="absolute top-4 left-4 h-4.5 w-auto opacity-85 sm:top-6.5 sm:left-6.5 sm:h-6"
              />

              <span className="relative flex flex-col items-center gap-3.5 sm:gap-5.5">
                <span className="relative inline-flex size-14.5 items-center justify-center rounded-full bg-white shadow-[0_12px_32px_rgba(0,0,0,0.32)] sm:size-21">
                  <span className="absolute inset-0 animate-ru-pulse rounded-full border-2 border-white/60 motion-reduce:animate-none" />
                  <span className="ml-1 size-0 border-y-[10px] border-l-[16px] border-y-transparent border-l-ru-blue-700 sm:ml-1.5 sm:border-y-[14px] sm:border-l-[22px]" />
                </span>
                <span className="text-center font-display text-[clamp(0.96875rem,2.2vw,1.25rem)] font-semibold tracking-[-0.015em] text-white">
                  See RateUp in action
                </span>
              </span>

              <span className="absolute right-3.5 bottom-3.5 text-[12.5px] font-semibold tracking-widest text-white/50 uppercase sm:right-6 sm:bottom-6">
                Product tour
              </span>
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
