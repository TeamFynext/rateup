import { useState } from "react";

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { rateupProductVideo, rateupProductVideoCover } from "@/utils/constants";

interface ProductVideoModalProps {
  /** Overrides the bucket film, mostly so the hero can be previewed against another cut. */
  src?: string | null;
  cover?: string;
  /** Sizing for the trigger button, so the hero can lay it out against its other CTAs. */
  className?: string;
}

/**
 * The hero's video button and the dialog it opens.
 *
 * The film is self-hosted on the CloudFront bucket, so the `<video>` — and with it the
 * megabytes and the poster — only mounts while the dialog is open. Keying it off `open` rather
 * than the popup's own mount also stops the sound the instant it closes, not after the exit
 * animation.
 */
export default function ProductVideoModal({
  src = rateupProductVideo,
  cover = rateupProductVideoCover,
  className = "",
}: Readonly<ProductVideoModalProps>) {
  const [open, setOpen] = useState(false);

  if (!src) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        className={`group inline-flex h-11.5 cursor-pointer items-center gap-2.75 rounded-full bg-white pr-5 pl-1.75 text-[15px] font-semibold tracking-[-0.005em] text-ru-blue-900 shadow-[0_12px_32px_rgba(4,12,24,0.35)] transition-transform hover:-translate-y-px motion-reduce:transition-none ${className}`}
      >
        <span className="relative inline-flex size-8 flex-none items-center justify-center rounded-full bg-ru-star-cta">
          <span className="absolute inset-0 animate-ru-pulse rounded-full border-2 border-ru-star-top/70 motion-reduce:animate-none" />
          <span className="ml-0.5 size-0 border-y-[5.5px] border-l-[9px] border-y-transparent border-l-ru-blue-900" />
        </span>
        See how RateUp works
        <span className="text-[13.5px] font-medium text-ru-n-500">90 sec</span>
      </DialogTrigger>

      {/* z-60: the support widget and the sticky header both sit at z-50. */}
      <DialogContent
        showCloseButton={false}
        overlayClassName="z-60 bg-ru-blue-950/85"
        className="z-60 w-[min(1100px,calc(100vw-2rem))] max-w-none gap-0 rounded-none bg-transparent p-0 ring-0 sm:max-w-none"
      >
        <DialogTitle className="sr-only">RateUp product tour</DialogTitle>

        <div className="relative aspect-video overflow-hidden rounded-2xl bg-black shadow-[0_32px_80px_rgba(0,0,0,0.5)]">
          {/* No `<track>`: no caption file has been cut for the film yet. Add one beside
                the mp4 in the bucket and it belongs here. */}
          {open && (
            <video
              src={src}
              poster={cover}
              title="RateUp product tour"
              autoPlay
              controls
              playsInline
              preload="none"
              className="absolute inset-0 size-full object-contain"
            />
          )}
        </div>

        <DialogClose
          aria-label="Close the video"
          className="absolute -top-12 right-0 inline-flex size-9.5 cursor-pointer items-center justify-center rounded-full border border-white/20 bg-white/10 text-white transition-colors hover:bg-white/20"
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
      </DialogContent>
    </Dialog>
  );
}
