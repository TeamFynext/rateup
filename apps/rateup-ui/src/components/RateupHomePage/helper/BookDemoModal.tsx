import { useState, type ReactNode } from "react";

import DemoModal from "../helpers/BookDemoComponent";

export function BookDemoModal1() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-white px-6 cursor-pointer sm:px-7 py-2.5 text-base sm:text-lg font-semibold rounded-md bg-linear-to-r from-[#00397b] via-primary to-[#3f5ba9] hover:opacity-90"
        aria-label="Book a Demo"
      >
        Book a Demo
      </button>
      <DemoModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}

interface BookDemoModalProps {
  children: ReactNode; // custom trigger button
}

export function BookDemoModal({ children }: BookDemoModalProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <span onClick={() => setOpen(true)} className="block cursor-pointer">
        {children}
      </span>
      <DemoModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
