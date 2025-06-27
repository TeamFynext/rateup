"use client";

import React, { useCallback, useState } from "react";

import { Loader2 } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function BookDemoModal({ children }: { children: React.ReactNode }) {
  const [isIframeLoading, setIsIframeLoading] = useState(true);

  const handleIframeLoad = useCallback(() => {
    setIsIframeLoading(false);
  }, []);

  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="w-full max-w-6xl p-0 !max-w-6xl">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle>Book a Demo</DialogTitle>
        </DialogHeader>

        {isIframeLoading && (
          <div className="flex justify-center items-center h-40">
            <Loader2 className="animate-spin h-6 w-6 text-gray-800" />
          </div>
        )}

        <iframe
          onLoad={handleIframeLoad}
          src="https://rateup.app/ws/8hKp9bb9"
          className="w-full h-[600px] border-none"
        />
      </DialogContent>
    </Dialog>
  );
}
