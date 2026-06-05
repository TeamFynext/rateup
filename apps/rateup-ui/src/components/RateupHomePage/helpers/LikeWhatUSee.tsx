"use client";

import { IconBrandWhatsapp } from "@tabler/icons-react";
import { Calendar, X } from "lucide-react";

import { RateupStar } from "@/components/integrations/logos";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import styles from "@/styles/commonCssModules/homepagecss.module.css";

type LikeWhatUSeeProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onBookDemo?: () => void;
  onWhatsapp?: () => void;
};

export default function LikeWhatUSee({
  open,
  onOpenChange,
  onBookDemo,
  onWhatsapp,
}: LikeWhatUSeeProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-white/10 p-0 overflow-hidden rounded-xl w-sm">
        {/* CLOSE */}
        <button
          onClick={() => onOpenChange(false)}
          className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-700 transition-all duration-200 hover:rotate-90 hover:bg-slate-200"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="px-8 pb-7 pt-10">
          {/* LOGO */}
          <div className="mb-5 flex justify-center">
            <div className=" flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-b from-[#0D2B57] to-[#081B38] text-2xl shadow-[0_12px_24px_rgba(13,43,87,0.28)]">
              <RateupStar className="h-8 w-8" />
            </div>
          </div>

          {/* TITLE */}
          <h2 className=" text-center text-2xl font-black leading-none tracking-[-0.03em]text-[#0D2550]">
            Like what you see?
          </h2>

          {/* SUBTITLE */}
          <p className=" mx-auto max-w-[320px] text-center text-sm mt-2 text-slate-400">
            Turn one-time buyers into repeat customers on WhatsApp. Let&apos;s
            find the fastest way to get you started.
          </p>

          {/* ACTIONS */}
          <div className="mt-4 flex flex-col gap-3">
            <Button
              onClick={() => onBookDemo?.()}
              className={`${styles.btn} ${styles["btn-primary"]} h-10 w-full`}
            >
              <Calendar /> Book a Demo
            </Button>

            <Button
              onClick={() => {
                onWhatsapp?.();
                const phone = import.meta.env.VITE_SUPPORT_WHATSAPP;
                const message = encodeURIComponent(
                  "Hi, I need help with support",
                );
                window.open(`https://wa.me/${phone}?text=${message}`, "_blank");
              }}
              className={`h-10 bg-green-500 w-full`}
            >
              <IconBrandWhatsapp /> Chat with us on WhatsApp
            </Button>
          </div>

          {/* LATER */}
          <div className="mt-4 text-center">
            <button
              onClick={() => onOpenChange(false)}
              className=" text-sm font-bold text-slate-400 transition-colors duration-200 hover:text-slate-500"
            >
              Maybe later
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
