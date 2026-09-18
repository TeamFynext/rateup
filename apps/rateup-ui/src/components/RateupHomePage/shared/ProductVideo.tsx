import { useState } from "react";

import { rateupLogoWhite, rateupProductVideo, rateupProductVideoCover } from "@/utils/constants";

/**
 * The 90-second product film, as a click-to-play facade.
 *
 * The film is self-hosted on the CloudFront bucket, so only its cover image is fetched
 * until someone asks for it: the `<video>` element — with it, the megabytes — only mounts
 * on the click. `preload="none"` keeps a second visit from fetching ahead of that click either.
 */
interface ProductVideoProps {
  /** Overrides the bucket film, mostly so the band can be previewed against another cut. */
  src?: string | null;
  /** The cover shown on the facade and as the `<video>` poster. */
  cover?: string;
}

export default function ProductVideo({
  src = rateupProductVideo,
  cover = rateupProductVideoCover,
}: Readonly<ProductVideoProps>) {
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
              poster={cover}
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
              className="group absolute inset-0 flex size-full cursor-pointer items-center justify-center border-0 bg-transparent"
            >
              {/* The cover carries its own headline, so the facade adds only the logo and the
                  play button — the button sits in the empty band between its text and phone. */}
              <img
                src={cover}
                alt=""
                loading="lazy"
                decoding="async"
                className="absolute inset-0 size-full object-cover"
              />

              <img
                src={rateupLogoWhite}
                alt=""
                loading="lazy"
                decoding="async"
                className="absolute top-4 left-4 h-4.5 w-auto opacity-85 sm:top-6.5 sm:left-6.5 sm:h-6"
              />

              <span className="relative inline-flex size-14.5 items-center justify-center rounded-full bg-white shadow-[0_12px_32px_rgba(0,0,0,0.32)] transition-transform group-hover:scale-105 motion-reduce:transition-none sm:size-21">
                <span className="absolute inset-0 animate-ru-pulse rounded-full border-2 border-white/60 motion-reduce:animate-none" />
                <span className="ml-1 size-0 border-y-[10px] border-l-[16px] border-y-transparent border-l-ru-blue-700 sm:ml-1.5 sm:border-y-[14px] sm:border-l-[22px]" />
              </span>
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
