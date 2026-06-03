"use client";

import type { ReactNode } from "react";
import React from "react";

import { useNavigate } from "@tanstack/react-router";

export function BookDemoModal1() {
  const navigate = useNavigate();

  return (
    <>
      <button
        onClick={() =>
          navigate({
            to: "/bookdemo",
          })
        }
        className="text-white px-6 cursor-pointer sm:px-7 py-2.5
                 text-base sm:text-lg font-semibold rounded-md bg-linear-to-r from-[#00397b]
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
  const navigate = useNavigate();

  return (
    <>
      {/* Trigger - any custom button passed as children */}
      <span
        onClick={() =>
          navigate({
            to: "/bookdemo",
          })
        }
        className="inline-block"
      >
        {children}
      </span>
    </>
  );
}
