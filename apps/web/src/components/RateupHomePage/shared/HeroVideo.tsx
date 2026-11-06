import { useCallback, useEffect, useRef, useState } from "react";

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  rateupProductVideo,
  rateupProductVideoCover,
  rateupProductVideoPreview,
} from "@/utils/constants";

const EASE_OUT = "cubic-bezier(0.2, 0.8, 0.2, 1)";

const prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** The transform that lays `el` over `from`, for growing the player out of the small frame and back. */
function overlay(el: HTMLElement, from: HTMLElement) {
  const a = from.getBoundingClientRect();
  const b = el.getBoundingClientRect();
  return `translate(${a.left - b.left}px, ${a.top - b.top}px) scale(${a.width / b.width})`;
}

/**
 * The homepage film as a small, silent loop under the hero that grows into the full player with
 * sound when clicked. The loop is a separate sub-1MB cut, so the film's own megabytes load only for
 * visitors who open it.
 */
export default function HeroVideo({
  src = rateupProductVideo,
  preview = rateupProductVideoPreview,
  cover = rateupProductVideoCover,
}: Readonly<{ src?: string; preview?: string; cover?: string }>) {
  const [open, setOpen] = useState(false);
  const thumbRef = useRef<HTMLButtonElement>(null);
  const loopRef = useRef<HTMLVideoElement>(null);
  const filmRef = useRef<HTMLVideoElement>(null);
  const frameRef = useRef<HTMLDivElement | null>(null);

  // The loop plays only while it is on screen and the player is closed, and never under reduced motion.
  useEffect(() => {
    const loop = loopRef.current;
    if (!loop || open || prefersReducedMotion()) return;
    loop.muted = true;
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) loop.play().catch(() => {});
      else loop.pause();
    });
    io.observe(loop);
    return () => {
      io.disconnect();
      loop.pause();
    };
  }, [open]);

  // A callback ref, because Base UI mounts the popup a render after `open` flips. Stable, or React
  // would re-attach it on every render and replay the growth.
  const growFromThumb = useCallback((el: HTMLDivElement | null) => {
    frameRef.current = el;
    if (!el || !thumbRef.current || prefersReducedMotion()) return;
    el.animate([{ transform: overlay(el, thumbRef.current) }, { transform: "none" }], {
      duration: 460,
      easing: EASE_OUT,
    });
  }, []);

  const onOpenChange = (next: boolean) => {
    if (next) return setOpen(true);
    filmRef.current?.pause();
    const el = frameRef.current;
    if (!el || !thumbRef.current || prefersReducedMotion()) return setOpen(false);
    el.animate([{ transform: "none" }, { transform: overlay(el, thumbRef.current) }], {
      duration: 320,
      easing: "cubic-bezier(0.4, 0, 0.2, 1)",
      fill: "forwards",
    }).finished.then(
      () => setOpen(false),
      () => setOpen(false),
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger
        ref={thumbRef}
        aria-label="Play the RateUp product tour, 90 seconds, with sound"
        className="group relative block aspect-video w-full cursor-pointer overflow-hidden rounded-2xl bg-ru-blue-950 shadow-[0_24px_60px_rgba(9,23,41,0.2)] ring-1 ring-ru-blue-950/10 sm:rounded-3xl"
      >
        <video
          ref={loopRef}
          src={preview}
          poster={cover}
          aria-hidden="true"
          muted
          loop
          playsInline
          preload="none"
          className="absolute inset-0 size-full object-cover transition-transform duration-500 group-hover:scale-[1.02] motion-reduce:transition-none"
        />
        <span className="absolute inset-0 bg-ru-blue-950/0 transition-colors group-hover:bg-ru-blue-950/10" />

        <span className="absolute top-3 right-3 inline-flex size-9 items-center justify-center rounded-full bg-ru-blue-950/55 text-white backdrop-blur-sm transition-transform group-hover:scale-105 sm:top-4 sm:right-4">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="size-4.5"
            aria-hidden="true"
          >
            <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
          </svg>
        </span>

        {/* Glass rather than solid, so it sits over both the navy cover and the light product moments. */}
        <span className="absolute top-1/2 left-1/2 inline-flex size-12 -translate-1/2 items-center justify-center rounded-full bg-ru-blue-950/30 ring-1 ring-white/45 backdrop-blur-md transition-[transform,background-color] duration-300 group-hover:scale-108 group-hover:bg-ru-blue-950/45 motion-reduce:transition-none sm:size-22">
          <span className="absolute inset-0 animate-ru-pulse rounded-full border-2 border-white/35 motion-reduce:animate-none" />
          <span className="ml-1 size-0 border-y-[8px] border-l-[13px] border-y-transparent border-l-white sm:ml-1.5 sm:border-y-[13px] sm:border-l-[21px]" />
        </span>
      </DialogTrigger>

      {/* z-60: the support widget and the sticky header both sit at z-50. The popup's own zoom is
          off, so `growFromThumb` measures it at full size. */}
      <DialogContent
        showCloseButton={false}
        overlayClassName="z-60 bg-ru-blue-950/85"
        className="z-60 w-[min(1280px,calc(100vw-2rem),calc((100svh-6rem)*16/9))] max-w-none gap-0 rounded-none bg-transparent p-0 ring-0 data-open:animate-none data-closed:animate-none sm:max-w-none"
      >
        <DialogTitle className="sr-only">RateUp product tour</DialogTitle>
        <div
          ref={growFromThumb}
          className="relative aspect-video origin-top-left overflow-hidden rounded-2xl bg-black shadow-[0_32px_80px_rgba(0,0,0,0.5)]"
        >
          <video
            ref={filmRef}
            src={src}
            poster={cover}
            title="RateUp product tour"
            autoPlay
            controls
            playsInline
            className="absolute inset-0 size-full object-contain"
          />
          <DialogClose
            aria-label="Close the video"
            className="absolute top-3 right-3 inline-flex size-9.5 cursor-pointer items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-sm transition-colors hover:bg-black/65"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              className="size-4.5"
              aria-hidden="true"
            >
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
}
