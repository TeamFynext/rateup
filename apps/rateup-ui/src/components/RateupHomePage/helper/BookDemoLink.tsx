import { Link, useNavigate } from "@tanstack/react-router";
import type { ReactNode } from "react";

/** Every "Book a demo" CTA on the marketing site lands here. */
export const BOOK_DEMO_ROUTE = "/book-a-demo" as const;

/** The site's standalone "Book a Demo" CTA, for slots that don't bring their own button. */
export function BookDemoButton() {
  return (
    <Link
      to={BOOK_DEMO_ROUTE}
      className="cursor-pointer rounded-md bg-linear-to-r from-[#00397b] via-primary to-[#3f5ba9] px-6 py-2.5 text-base font-semibold text-white hover:opacity-90 sm:px-7 sm:text-lg"
    >
      Book a Demo
    </Link>
  );
}

interface BookDemoLinkProps {
  children: ReactNode; // custom trigger button
}

/**
 * Sends an existing CTA to `/book-a-demo`, which is the one place the site captures a lead.
 *
 * The trigger stays a `<button>` supplied by the call site, so this wraps it in a click-handling
 * `<span>` rather than an `<a>` — an anchor around a button is invalid markup, and the button is
 * already focusable, so keyboard activation bubbles here on its own.
 */
export function BookDemoLink({ children }: BookDemoLinkProps) {
  const navigate = useNavigate();

  return (
    <span onClick={() => navigate({ to: BOOK_DEMO_ROUTE })} className="block cursor-pointer">
      {children}
    </span>
  );
}
