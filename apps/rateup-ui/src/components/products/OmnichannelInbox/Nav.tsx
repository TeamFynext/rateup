import { useEffect, useState } from "react";

import { Link, useNavigate } from "@tanstack/react-router";

import { useCheckSession } from "@/hooks/checkSession";
import { RateupStar } from "@/components/integrations/logos";
import { BookDemoModal } from "@/components/RateupHomePage/helper/BookDemoModal";
import DropDownNavItems from "@/components/RateupHomePage/helpers/DropDownNavItems";
import { Button } from "@/components/ui/button";

import { StarIcon } from "./icons";
import style from "./omnichannel.module.css";

interface Props {
  onAccess: () => void;
}

export default function Nav({ onAccess }: Props) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const navItems = [
    {
      name: "Pricing",
      link: "/pricing",
    },
    {
      name: "Contact",
      link: "/contact-us",
    },
    {
      name: "About Us",
      link: "/about-us",
    },
    {
      name: "Blog",
      link: "/blog",
    },
  ];
  const hasSession = useCheckSession();
  const navigate = useNavigate();
  const [shrunk, setShrunk] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      className="sticky top-0 z-50 transition-all duration-300"
      style={
        scrolled
          ? {
              background: "rgba(7,22,46,0.82)",
              backdropFilter: "blur(16px) saturate(150%)",
              borderBottom: "1px solid rgba(255,255,255,0.09)",
            }
          : {}
      }
    >
      <div className="max-w-[1320px] mx-auto px-4 md:px-8">
        <div
          className={`flex items-center gap-9 ${shrunk ? "h-16" : "h-16 md:h-20"} transition-[height] duration-200`}
        >
          <Link
            to="/"
            className="relative z-20 mr-4 flex items-center
                          space-x-2 px-2 py-1 text-sm font-normal text-black"
          >
            <span className={style.brand}>
              <RateupStar className="h-8 w-8" />
              <span className={style.wm}>
                Rate
                <span className={style.up}>Up</span>
              </span>
            </span>
          </Link>

          {/* Desktop nav links */}
          <div className="hidden md:flex flex-1 items-center justify-center gap-8">
            <DropDownNavItems dropdownStyle="text-[14px] font-medium text-white/75 no-underline hover:text-white transition-colors " />
            {navItems.map((item) => (
              <Link
                key={item.name}
                to={item.link}
                className="text-[14px] font-medium text-white/75 no-underline hover:text-white transition-colors"
              >
                {item.name}
              </Link>
            ))}
          </div>

          {/* Desktop CTA buttons */}
          {hasSession ? (
            <div className="hidden md:flex items-center gap-4">
              <Link to={"/dashboard"}>
                <Button
                  className={` ${style["btn"]} ${style["btn-ghost"]} ${style["btn-sm"]}`}
                  size="lg"
                >
                  Dashboard
                </Button>
              </Link>
            </div>
          ) : (
            <div className="hidden md:flex items-center gap-4 justify-center">
              <button
                onClick={() => navigate({ to: "/login" })}
                className={` ${style["btn"]} ${style["btn-ghost"]} ${style["btn-sm"]}`}
              >
                Login
              </button>
              <button
                onClick={() => navigate({ to: "/signup" })}
                className={` ${style["btn"]} ${style["btn-primary"]} ${style["btn-sm"]}`}
              >
                <span style={{ paddingRight: 2 }}>Start Free Trial</span>
                <span className="inline-flex items-center justify-center w-[30px] h-[20px] rounded-[8px] bg-chip-dark flex-shrink-0">
                  <svg
                    className="w-[15px] h-[15px]"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="9 6 15 12 9 18" />
                  </svg>
                </span>
              </button>
              <BookDemoModal>
                <button className="bg-white/10 text-white border border-white/20 hover:bg-white/15 inline-flex items-center gap-3 rounded-2xl font-extrabold text-sm pl-4 py-[5px] pr-[5px] hover:-translate-y-0.5 active:scale-[0.97] transition-all cursor-pointer whitespace-nowrap">
                  <span style={{ paddingRight: 2 }}>Book A Demo</span>
                  <span className="inline-flex items-center justify-center w-[30px] h-[30px] rounded-[8px] bg-white/65 flex-shrink-0">
                    <svg
                      className="w-[15px] h-[15px]"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect x="3" y="4" width="18" height="18" rx="2" />
                      <line x1="16" y1="2" x2="16" y2="6" />
                      <line x1="8" y1="2" x2="8" y2="6" />
                      <line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                  </span>
                </button>
              </BookDemoModal>
            </div>
          )}

          {/* Mobile: Sign Up CTA + Hamburger */}
          <div className="flex md:hidden items-center gap-3 ml-auto">
            <button
              onClick={() => navigate({ to: "/signup" })}
              className={`${style["btn"]} ${style["btn-primary"]} ${style["btn-sm"]}`}
            >
              Start Free
            </button>
            <button
              onClick={() => setMobileOpen((o) => !o)}
              className="w-9 h-9 flex flex-col items-center justify-center gap-[5px] bg-transparent border-0 cursor-pointer rounded-lg hover:bg-ink-50 transition-colors"
              aria-label="Toggle menu"
            >
              <span
                className={`block w-5 h-[2px] bg-ink-700 rounded-full transition-all duration-200 ${mobileOpen ? "rotate-45 translate-y-[7px]" : ""}`}
              />
              <span
                className={`block w-5 h-[2px] bg-ink-700 rounded-full transition-all duration-200 ${mobileOpen ? "opacity-0" : ""}`}
              />
              <span
                className={`block w-5 h-[2px] bg-ink-700 rounded-full transition-all duration-200 ${mobileOpen ? "-rotate-45 -translate-y-[7px]" : ""}`}
              />
            </button>
          </div>
        </div>

        {/* Mobile dropdown menu */}
        {mobileOpen && (
          <div
            className="md:hidden pb-5 flex flex-col gap-1"
            style={{ borderTop: "1px solid rgba(255,255,255,0.09)" }}
          >
            <DropDownNavItems dropdownStyle="block text-[15px] font-medium text-white/75 no-underline hover:text-white transition-colors px-2 py-2.5" />
            {navItems.map((item) => (
              <Link
                key={item.name}
                to={item.link}
                className="block text-[15px] font-medium text-white/75 no-underline hover:text-white transition-colors px-2 py-2.5"
                onClick={() => setMobileOpen(false)}
              >
                {item.name}
              </Link>
            ))}
            <div
              className="flex flex-col gap-2.5 mt-3 pt-3"
              style={{ borderTop: "1px solid rgba(255,255,255,0.09)" }}
            >
              {hasSession ? (
                <Link to="/dashboard" onClick={() => setMobileOpen(false)}>
                  <Button
                    className={`w-full ${style["btn"]} ${style["btn-ghost"]} ${style["btn-sm"]}`}
                    size="lg"
                  >
                    Dashboard
                  </Button>
                </Link>
              ) : (
                <>
                  <button
                    onClick={() => {
                      navigate({ to: "/login" });
                      setMobileOpen(false);
                    }}
                    className={`w-full ${style["btn"]} ${style["btn-ghost"]} ${style["btn-sm"]}`}
                  >
                    Login
                  </button>
                  <BookDemoModal>
                    <button className="w-full bg-white/10 text-white border border-white/20 hover:bg-white/15 inline-flex items-center justify-center gap-2 rounded-xl font-bold text-sm px-4 py-3 transition-all cursor-pointer">
                      Book A Demo
                    </button>
                  </BookDemoModal>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}

// Keep StarIcon import quiet
const _StarIcon = StarIcon;
