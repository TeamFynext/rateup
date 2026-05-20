import { Play, XIcon } from "lucide-react";

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog.tsx";

export default function VideoPlayer() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-full border cursor-pointer
                      border-emerald-900 px-4 py-2 sm:px-6 sm:py-2.5 text-base font-semibold text-[#00397b] 
                      transition hover:scale-105 "
        >
          <Play size={20} strokeWidth={2.5} />
          How&nbsp;it&nbsp;works
        </button>
      </DialogTrigger>

      <DialogContent
        className="!w-full !max-w-6xl p-0 rounded-3xl shadow-2xl border-2 border-[#1c518e]/20 
  animate-in fade-in-90 zoom-in-95"
      >
        <DialogClose asChild>
          <button
            className="absolute top-4 right-4 z-50 text-white font-bold bg-[#1c518e]
      border-2 border-white cursor-pointer w-12 h-12 flex items-center justify-center shadow-lg transition-all"
            aria-label="Close"
          >
            <XIcon className="text-white" size={24} />
          </button>
        </DialogClose>

        <div className="relative w-full aspect-video overflow-hidden rounded-3xl">
          <iframe
            src="https://www.youtube.com/embed/HRioJq9q5Z4?si=AIhdM0zYcbO3M2e_"
            title="Growth Journey Video"
            allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="w-full h-full rounded-3xl"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
