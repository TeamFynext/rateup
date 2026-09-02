import { Link, useRouterState } from "@tanstack/react-router";
import { Image } from "@unpic/react";
import { useEffect, useState } from "react";

import { useCheckSession } from "@/hooks/checkSession.tsx";
import { rateupLogo } from "@/utils/constants.ts";

import { BOOK_DEMO_ROUTE } from "../helper/BookDemoLink.tsx";
import DropDownNavItems from "../helpers/DropDownNavItems.tsx";
import { ArrowRight } from "./home-ui.tsx";

/**
 * The floating pill nav from the design.
 *
 * `Layout` already supplies the `sticky top-0` header, so this renders the gutter and the
 * pill itself. The pill is translucent over a blur, which only reads once page content is
 * scrolling underneath it — that is also when the shadow deepens and the pill narrows.
 */

const NAV_LINKS = [
  { label: "Pricing", to: "/pricing" },
  { label: "Contact", to: "/contact-us" },
  { label: "About Us", to: "/about-us" },
  { label: "Blog", to: "/blog" },
] as const;

const PRODUCTS = [
  { label: "WhatsApp Loyalty", to: "/products/whatsapp-loyalty" },
  { label: "WhatsApp Feedback", to: "/products/whatsapp-feedback" },
  { label: "Omnichannel Inbox", to: "/products/omnichannel-inbox" },
] as const;

const DESKTOP_LINK =
  "text-[clamp(14px,1.5vw,16.5px)] font-semibold tracking-[-0.01em] whitespace-nowrap text-ru-n-700 transition-colors hover:text-ru-blue-600";

const SHEET_LINK =
  "flex h-13 items-center rounded-lg px-3 text-[16.5px] font-semibold text-ru-n-700 transition-colors hover:bg-ru-n-50 hover:text-ru-blue-600";

export default function RateupNavbar() {
  const hasSession = useCheckSession();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const pathname = useRouterState({ select: (state) => state.location.pathname });

  useEffect(() => {
    const onScroll = () => setScrolled(globalThis.scrollY > 12);
    globalThis.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => globalThis.removeEventListener("scroll", onScroll);
  }, []);

  /* Navigating with the sheet open would otherwise leave it covering the new page. */
  useEffect(() => setMenuOpen(false), [pathname]);

  return (
    <div className="px-2.5 py-2 sm:px-6 sm:py-4">
      <div
        className={`relative mx-auto transition-[max-width] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          scrolled ? "max-w-270" : "max-w-300"
        }`}
      >
        <div
          className={`flex items-center gap-2 rounded-full border border-ru-n-200 bg-ink-25/82 px-3 py-2 backdrop-blur-md backdrop-saturate-150 transition-shadow duration-200 sm:gap-4.5 sm:px-5 sm:py-2.5 ${
            scrolled
              ? "shadow-[0_16px_40px_rgba(16,24,40,0.16)]"
              : "shadow-[0_2px_10px_rgba(16,24,40,0.05)]"
          }`}
        >
          <Link to="/" aria-label="RateUp home" className="flex-none">
            <Image
              src={rateupLogo}
              alt="RateUp"
              width={126}
              height={50}
              className="h-8 w-auto sm:h-12"
            />
          </Link>

          {/* Wider than the comp's `clamp(12px, 1.6vw, 26px)`. There is room for it: at the
              pill's 1200px the five items and both CTAs still leave ~300px spare. */}
          <nav className="hidden min-w-0 flex-1 items-center justify-center gap-[clamp(20px,2.4vw,40px)] lg:flex">
            <DropDownNavItems dropdownStyle={DESKTOP_LINK} />
            {NAV_LINKS.map((item) => (
              <Link key={item.label} to={item.to} className={DESKTOP_LINK}>
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex flex-none items-center gap-1.5 sm:gap-2.5">
            {hasSession ? (
              <Link
                to="/dashboard"
                className="inline-flex h-11.5 items-center gap-2 rounded-full bg-ru-blue-600 px-3.5 text-[clamp(14px,1.6vw,15.5px)] font-semibold whitespace-nowrap text-white shadow-xs transition-colors hover:bg-ru-blue-700 sm:px-6"
              >
                Dashboard
                <ArrowRight className="hidden size-4 sm:block" />
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className="hidden h-11 items-center rounded-lg px-3.5 text-[clamp(14px,1.6vw,15.5px)] font-semibold whitespace-nowrap text-ru-n-700 transition-colors hover:text-ru-blue-600 lg:inline-flex"
                >
                  Login
                </Link>
                <Link
                  to="/signup"
                  /* The design promotes this to the amber star gradient — the only warm
                     surface in a nav of blues and neutrals, so it carries the eye without
                     needing more size. Ink is `ru-blue-950` rather than white: amber is far
                     too light to hold white text at this weight. */
                  className="inline-flex h-11.5 items-center gap-2 rounded-full border border-ru-amber-600 bg-ru-star px-3.5 text-[clamp(14px,1.6vw,15.5px)] font-semibold whitespace-nowrap text-ru-blue-950 shadow-[0_4px_14px_rgba(248,149,29,0.28)] transition-[filter,box-shadow,transform] duration-200 ease-[cubic-bezier(0.4,0,0.2,1)] hover:-translate-y-px hover:brightness-105 hover:shadow-[0_6px_20px_rgba(248,149,29,0.36)] sm:px-6"
                >
                  Start for Free
                  {/* The pill is the widest thing in the bar. Below `sm` the arrow is the one
                      part that carries no meaning, so it is what goes. */}
                  <ArrowRight className="hidden size-4.25 sm:block" />
                </Link>
              </>
            )}

            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
              className="inline-flex size-11.5 flex-none items-center justify-center rounded-full border border-ru-n-200 bg-white text-ru-n-700 transition-colors hover:border-ru-n-300 lg:hidden"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                className="size-5"
                aria-hidden="true"
              >
                {menuOpen ? (
                  <path d="M6 6l12 12M18 6 6 18" />
                ) : (
                  <path d="M4 7h16M4 12h16M4 17h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {menuOpen && (
          <div className="absolute inset-x-0 top-[calc(100%+10px)] flex flex-col gap-0.5 rounded-[20px] border border-ru-n-200 bg-white p-3.5 shadow-[0_24px_56px_rgba(16,24,40,0.18)] lg:hidden">
            <div className="px-3 pt-1 pb-2 text-[12.5px] font-semibold tracking-widest text-ru-n-400 uppercase">
              Product
            </div>
            {PRODUCTS.map((item) => (
              <Link key={item.label} to={item.to} className={SHEET_LINK}>
                {item.label}
              </Link>
            ))}

            <div className="my-2 h-px bg-ru-n-100" />

            {NAV_LINKS.map((item) => (
              <Link key={item.label} to={item.to} className={SHEET_LINK}>
                {item.label}
              </Link>
            ))}

            <div className="mt-2.5 flex flex-col gap-2.5 border-t border-ru-n-100 pt-3.5">
              <Link
                to={BOOK_DEMO_ROUTE}
                className="inline-flex h-13 items-center justify-center rounded-lg bg-ru-blue-600 text-base font-bold text-white transition-colors hover:bg-ru-blue-700"
              >
                Book a Demo
              </Link>
              <Link
                to={hasSession ? "/dashboard" : "/login"}
                className="inline-flex h-13 items-center justify-center rounded-lg border border-ru-n-200 bg-white text-base font-bold text-ru-n-700 transition-colors hover:border-ru-n-300 hover:text-ru-blue-600"
              >
                {hasSession ? "Dashboard" : "Login"}
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
