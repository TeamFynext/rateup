import { useEffect, useRef, useState } from "react";

/* Marks that the auto-open has had its turn. Session-scoped on purpose: a new visit is worth
   one opener, the same visit re-reading a third page is not. */
export const AUTO_OPENED_KEY = "support_widget_auto_opened";

/* Served from the web-images distribution like every other `/images/…` asset. */
const LAUNCHER_AVATAR = `${import.meta.env.VITE_CLOUDFRONT_WEB_IMAGES_URL}/images/support.jpeg`;

export function PersonGlyph({ className = "size-6" }: Readonly<{ className?: string }>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <circle cx="12" cy="8.6" r="3.9" />
      <path d="M4.8 20.2a7.4 7.4 0 0 1 14.4 0" />
    </svg>
  );
}

interface SupportLauncherProps {
  onOpen: () => void;
  /** Fired on hover/focus, so the marketing layout can start fetching the panel early. */
  onIntent?: () => void;
}

/**
 * The widget's closed state. Kept free of the widget's dependencies so the marketing layout
 * can draw it on first paint and fetch the panel only when it is wanted — the widget draws
 * this same component, so the swap cannot shift.
 */
export function SupportLauncher({ onOpen, onIntent }: Readonly<SupportLauncherProps>) {
  const [avatarFailed, setAvatarFailed] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  /* Server-rendered, so the photo can fail before hydration attaches `onError`. */
  useEffect(() => {
    const img = imgRef.current;
    if (img?.complete && img.naturalWidth === 0) setAvatarFailed(true);
  }, []);

  return (
    <div className="fixed right-5.5 bottom-5.5 z-[88] flex items-center gap-3">
      {/* The pill is 240px of chrome over the page; below `sm` the tile carries it alone. */}
      <button
        type="button"
        onClick={onOpen}
        onPointerEnter={onIntent}
        onFocus={onIntent}
        className="hidden h-13 cursor-pointer items-center gap-2.75 rounded-full bg-ru-blue-950 px-5.5 text-base font-semibold text-white shadow-[0_12px_30px_rgba(9,23,41,0.26)] transition-transform hover:-translate-y-px sm:inline-flex"
      >
        <span className="size-2.25 flex-none rounded-full bg-[#4ecb8b]" />
        How can we help you?
      </button>
      <button
        type="button"
        onClick={onOpen}
        onPointerEnter={onIntent}
        onFocus={onIntent}
        aria-label="Open chat"
        className="relative size-15.5 flex-none cursor-pointer rounded-full bg-ru-blue-950 text-white/85 shadow-[0_14px_32px_rgba(9,23,41,0.3)] transition-transform hover:-translate-y-px"
      >
        {/* The glyph stays underneath: it shows while the photo loads, and remains if the
            photo never arrives — a broken image on a customer's page is worse. */}
        <span className="absolute inset-0 flex items-center justify-center">
          <PersonGlyph className="size-7.5" />
        </span>
        {!avatarFailed && (
          <img
            ref={imgRef}
            src={LAUNCHER_AVATAR}
            alt=""
            loading="lazy"
            decoding="async"
            onError={() => setAvatarFailed(true)}
            className="absolute inset-0 size-full rounded-full object-cover"
          />
        )}
        <span className="absolute right-0.5 bottom-0.5 size-3.75 rounded-full border-[2.5px] border-ru-n-25 bg-wa-green" />
      </button>
    </div>
  );
}
