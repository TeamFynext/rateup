import QRCode from "qrcode";
import { useEffect, useState } from "react";

import { RateupStar } from "@/components/integrations/logos";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

import { WhatsAppMark } from "../shared/channel-marks";

/**
 * The "Like what you see?" popup, drawn to the marketing design.
 *
 * Colour comes from the `ru-*` ramp in `styles/foundation.css` — the same palette the design was drawn
 * against. The design's two buttons are flat brand colours rather than gradients, which is
 * what the rest of the redesign does.
 */

interface LikeWhatUSeeProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onBookDemo?: () => void;
  onWhatsapp?: () => void;
}

const WHATSAPP_MESSAGE = "Hi, I need help with support";

const CTA = "flex h-14 items-center justify-center gap-2.75 rounded-xl text-[16.5px] font-bold";

export default function LikeWhatUSee({
  open,
  onOpenChange,
  onBookDemo,
  onWhatsapp,
}: Readonly<LikeWhatUSeeProps>) {
  const [qr, setQr] = useState<string | null>(null);
  const phone = import.meta.env.VITE_SUPPORT_WHATSAPP;
  const waHref = `https://wa.me/${phone}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`;

  /* Generated from the same href the button opens, so the code cannot drift from the number
     the way a checked-in `qr-code.png` can. Only worth doing once the popup is asked for. */
  useEffect(() => {
    if (!open || qr) return;
    QRCode.toDataURL(waHref, {
      margin: 0,
      width: 360,
      color: { dark: "#091729", light: "#ffffff" },
    })
      .then(setQr)
      .catch(() => setQr(null));
  }, [open, qr, waHref]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        overlayClassName="bg-[rgba(9,23,41,0.6)] supports-backdrop-filter:backdrop-blur-[5px]"
        className="block w-[min(100%,470px)] rounded-[26px] bg-white p-[clamp(24px,4vw,36px)] text-center shadow-[0_40px_90px_rgba(9,23,41,0.42)] ring-0 sm:max-w-[470px]"
      >
        {/* `showCloseButton={false}` above: the dialog ships its own, which sat stacked on top
            of this one. This is the design's — 44px, bordered, not a ghost icon button. */}
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          aria-label="Close"
          className="absolute top-4 right-4 inline-flex size-11 cursor-pointer items-center justify-center rounded-full border border-ru-n-200 bg-ru-n-50 text-ru-n-500 transition-colors hover:border-ru-n-300 hover:text-ru-n-700"
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
        </button>

        <span className="mb-5 inline-flex size-19 items-center justify-center rounded-[20px] bg-ru-blue-950 shadow-[0_12px_28px_rgba(9,23,41,0.24)]">
          <RateupStar className="size-10.5" />
        </span>

        <DialogTitle className="mb-3 font-display text-[clamp(1.625rem,4vw,2.125rem)]/[1.08] font-bold tracking-[-0.032em] text-ru-n-700">
          Like what you see?
        </DialogTitle>

        <DialogDescription className="mx-auto mb-6.5 max-w-[38ch] text-base/[1.55] text-pretty text-ru-n-500">
          Turn one-time buyers into repeat customers on WhatsApp. Let&apos;s find the fastest way to
          get you started.
        </DialogDescription>

        <div className="mb-6.5 flex flex-col gap-3">
          <button
            type="button"
            onClick={() => onBookDemo?.()}
            className={`${CTA} cursor-pointer bg-ru-blue-600 text-white transition-colors hover:bg-ru-blue-700`}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.9"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="size-4.75"
              aria-hidden="true"
            >
              <rect x="3.5" y="5" width="17" height="16" rx="3" />
              <path d="M8 3v4M16 3v4M3.5 10h17" />
            </svg>
            Book a Demo
          </button>

          <a
            href={waHref}
            target="_blank"
            rel="noreferrer"
            onClick={() => onWhatsapp?.()}
            className={`${CTA} bg-ru-green-500 text-white transition-colors hover:bg-ru-green-600`}
          >
            <WhatsAppMark className="size-5" />
            Chat with us on WhatsApp
          </a>
        </div>

        <div className="mb-5 flex items-center gap-3.5">
          <span className="h-px flex-1 bg-ru-n-200" />
          <span className="text-xs font-semibold tracking-[0.1em] whitespace-nowrap text-ru-n-400 uppercase">
            Or scan with your phone
          </span>
          <span className="h-px flex-1 bg-ru-n-200" />
        </div>

        <div className="flex items-start gap-4 rounded-2xl border border-ru-n-200 bg-ru-n-50 p-4 text-left">
          <div className="size-26 flex-none rounded-[10px] border border-ru-n-200 bg-white p-2">
            {qr && <img src={qr} alt="" className="size-full" />}
          </div>
          <div className="min-w-0">
            <div className="mb-1.75 flex items-center gap-2">
              <span className="inline-flex size-5 flex-none items-center justify-center rounded-[5px] bg-wa-green text-white">
                <WhatsAppMark className="size-3" />
              </span>
              <span className="font-display text-[16.5px] font-bold tracking-[-0.018em] text-ru-n-700">
                Open on your phone
              </span>
            </div>
            <p className="text-sm/[1.5] text-ru-n-500">
              Point your phone camera at this code to open WhatsApp and start chatting with us
              instantly.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onOpenChange(false)}
          className="mt-5 h-12 cursor-pointer px-4.5 text-[15.5px] font-bold text-ru-n-400 transition-colors hover:text-ru-n-600"
        >
          Maybe later
        </button>
      </DialogContent>
    </Dialog>
  );
}
