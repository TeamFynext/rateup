"use client";

import React, { ReactNode } from "react";
import { useRouter } from "next/navigation";

export function BookDemoModal1() {
  const router = useRouter();

  return (
    <>
      <button
        onClick={() => router.push("/bookdemo")}
        className="text-white px-6 cursor-pointer sm:px-7 py-2.5
                 text-base sm:text-lg font-semibold rounded-md bg-gradient-to-r from-[#00397b]
                  via-[#1c518e] to-[#3f5ba9] hover:opacity-90"
        aria-label="Book a Demo"
      >
        Book a Demo
      </button>
    </>
  );
}

interface BookDemoModalProps {
  children: ReactNode; // custom trigger button
}

export function BookDemoModal({ children }: BookDemoModalProps) {
  const router = useRouter();

  return (
    <>
      {/* Trigger - any custom button passed as children */}
      <span onClick={() => router.push("/bookdemo")} className="inline-block">
        {children}
      </span>
    </>
  );
}
