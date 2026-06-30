import { IconBrandWhatsapp } from "@tabler/icons-react";
import { Calendar, X } from "lucide-react";

import { imagesPath } from "@/components/HomePage/constants";
import { RateupStar } from "@/components/integrations/logos";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";

interface LikeWhatUSeeProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onBookDemo?: () => void;
  onWhatsapp?: () => void;
}

export default function LikeWhatUSee({
  open,
  onOpenChange,
  onBookDemo,
  onWhatsapp,
}: LikeWhatUSeeProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-slate-100 p-0 overflow-hidden rounded-2xl sm:max-w-[440px] w-[95vw] bg-white">
        {/* CLOSE */}
        <button
          onClick={() => onOpenChange(false)}
          className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-slate-100/80 text-slate-500 transition-all duration-200 hover:bg-slate-200/80 hover:text-slate-850"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="px-8 pb-7 pt-10">
          {/* LOGO */}
          <div className="mb-5 flex justify-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-b from-[#0D2B57] to-[#081B38] text-2xl shadow-[0_12px_24px_rgba(13,43,87,0.28)]">
              <RateupStar className="h-8 w-8" />
            </div>
          </div>

          {/* TITLE */}
          <h2 className="text-center text-2xl font-black leading-none tracking-[-0.03em] text-[#0D2550]">
            Like what you see?
          </h2>

          {/* SUBTITLE */}
          <p className=" mx-auto max-w-[320px] text-center text-sm mt-2 text-slate-400">
            Turn one-time buyers into repeat customers on WhatsApp. Let&apos;s find the fastest way
            to get you started.
          </p>

          {/* ACTIONS */}
          <div className="mt-6 flex flex-col gap-3">
            <Button
              onClick={() => onBookDemo?.()}
              className="h-12 w-full rounded-xl bg-gradient-to-r from-[#2c6fd6] to-[#1e5bb8] font-bold text-white shadow-[0_4px_12px_rgba(44,111,214,0.25)] transition-all duration-200 hover:from-[#1e5bb8] hover:to-[#174895] hover:shadow-[0_6px_16px_rgba(44,111,214,0.35)] hover:-translate-y-[0.5px] active:translate-y-0"
            >
              <Calendar className="mr-2 h-5 w-5" /> Book a Demo
            </Button>

            <Button
              onClick={() => {
                onWhatsapp?.();
                const phone = import.meta.env.VITE_SUPPORT_WHATSAPP;
                const message = encodeURIComponent("Hi, I need help with support");
                window.open(`https://wa.me/${phone}?text=${message}`, "_blank");
              }}
              className="h-12 w-full rounded-xl bg-gradient-to-r from-[#22c55e] to-[#16a34a] font-bold text-white shadow-[0_4px_12px_rgba(22,163,74,0.25)] transition-all duration-200 hover:from-[#16a34a] hover:to-[#15803d] hover:shadow-[0_6px_16px_rgba(22,163,74,0.35)] hover:-translate-y-[0.5px] active:translate-y-0"
            >
              <IconBrandWhatsapp className="mr-2 h-5 w-5" /> Chat with us on WhatsApp
            </Button>
          </div>

          {/* SEPARATOR */}
          <div className="my-5 flex items-center justify-center gap-3">
            <div className="h-[1px] flex-1 bg-slate-100" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              or scan with your phone
            </span>
            <div className="h-[1px] flex-1 bg-slate-100" />
          </div>

          {/* QR CODE SECTION */}
          <div className="flex gap-4 rounded-xl border border-blue-100 bg-[#f4f8ff]/60 p-4 text-left">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
              <img
                src={`${imagesPath}/qr-code.png`}
                alt="WhatsApp QR Code"
                className="h-full w-full object-contain"
              />
            </div>
            <div className="flex flex-col justify-center">
              <div className="flex items-center gap-1.5 text-sm font-bold text-[#0D2550]">
                <IconBrandWhatsapp className="h-4.5 w-4.5 text-green-500" />
                <span>Open on your phone</span>
              </div>
              <p className="mt-1 text-[11.5px] leading-normal text-slate-500 font-medium">
                Point your phone camera at this code to open WhatsApp and start chatting with us
                instantly.
              </p>
            </div>
          </div>

          {/* LATER */}
          <div className="mt-5 text-center">
            <button
              onClick={() => onOpenChange(false)}
              className="text-sm font-bold text-slate-400 transition-colors duration-200 hover:text-slate-500"
            >
              Maybe later
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
