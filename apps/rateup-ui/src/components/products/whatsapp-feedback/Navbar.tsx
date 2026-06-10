import { useEffect, useState } from "react";

import { Link, useNavigate } from "@tanstack/react-router";

import { useCheckSession } from "@/hooks/checkSession";
import { RateupStar } from "@/components/integrations/logos";
import { BookDemoModal } from "@/components/RateupHomePage/helper/BookDemoModal";
import DropDownNavItems from "@/components/RateupHomePage/helpers/DropDownNavItems";
import { Button } from "@/components/ui/button";

import style from "./feedback.module.css";

export default function Navbar() {
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
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setShrunk(window.scrollY > 24);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      id="navbar"
      className={`sticky top-0 z-[60] bg-white/80 backdrop-blur-[14px] [backdrop-filter:blur(14px)_saturate(140%)] border-b border-[rgba(236,236,234,0.7)] transition-shadow ${shrunk ? "shadow-[0_6px_20px_rgba(11,31,72,0.06)]" : ""}`}
    >
      <div className="max-w-[1320px] mx-auto px-5 md:px-8">
        <div
          className={`flex items-center gap-4 md:gap-9 ${shrunk ? "h-14 md:h-16" : "h-16 md:h-20"} transition-[height] duration-200`}
        >
          <Link
            to="/"
            className="relative z-20 mr-2 md:mr-4 flex items-center space-x-2 px-2 py-1 text-sm font-normal text-black"
          >
            <span className={style.brand}>
              <RateupStar className="h-8 w-8" />
              <span className={style.wm}>
                Rate
                <span className={style.up}>Up</span>
              </span>
            </span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex flex-1 items-center justify-center gap-8">
            <DropDownNavItems dropdownStyle="font-extrabold text-slate-800 text-ink-800 hover:text-fb-green transition-colors duration-200 " />
            {navItems.map((item) => (
              <Link
                key={item.name}
                to={item.link}
                className="text-[16px] font-semibold text-slate-800 hover:text-fb-green transition-colors duration-200"
              >
                {item.name}
              </Link>
            ))}
          </div>

          {/* Desktop auth buttons */}
          {hasSession ? (
            <div className="hidden md:flex items-center gap-4 ml-auto">
              <Link to={"/dashboard"}>
                <Button
                  className="bg-transparent font-extrabold text-base text-ink-800 border border-ink-200 py-3 px-[22px] rounded-xl hover:border-fb-green hover:text-fb-green transition-colors cursor-pointer"
                  size="lg"
                >
                  Dashboard
                </Button>
              </Link>
            </div>
          ) : (
            <div className="hidden md:flex items-center gap-4 justify-center ml-auto">
              <button
                onClick={() => navigate({ to: "/login" })}
                className="bg-transparent font-extrabold text-base text-ink-800 border border-ink-200 py-3 px-[22px] rounded-xl hover:border-fb-green hover:text-fb-green transition-colors cursor-pointer"
              >
                Login
              </button>
              <button
                onClick={() => navigate({ to: "/signup" })}
                className="inline-flex items-center gap-3 border-0 rounded-2xl font-extrabold text-sm tracking-[-0.01em] pl-4 py-[5px] pr-[5px] text-white bg-gradient-to-br from-fb-green to-fb-green-2 shadow-[0_10px_26px_rgba(42,98,84,0.40)] hover:shadow-[0_14px_34px_rgba(42,98,84,0.55)] hover:-translate-y-0.5 active:scale-[0.97] transition-all cursor-pointer whitespace-nowrap"
              >
                <span style={{ paddingRight: 2 }}>Start Free Trial</span>
                <span className="inline-flex items-center justify-center w-[30px] h-[30px] rounded-[8px] bg-chip-dark flex-shrink-0">
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
                <button className="inline-flex items-center gap-3 border-0 rounded-2xl font-extrabold text-sm pl-4 py-[5px] pr-[5px] text-[#0F2820] bg-periwinkle hover:bg-periwinkle-2 hover:-translate-y-0.5 active:scale-[0.97] transition-all cursor-pointer whitespace-nowrap">
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

          {/* Mobile CTA + hamburger */}
          <div className="flex md:hidden items-center gap-3 ml-auto">
            <button
              onClick={() => navigate({ to: "/signup" })}
              className="inline-flex items-center border-0 rounded-xl font-extrabold text-xs tracking-[-0.01em] px-3.5 py-2 text-white bg-gradient-to-br from-fb-green to-fb-green-2 cursor-pointer whitespace-nowrap"
            >
              Start Free
            </button>
            <button
              onClick={() => setMenuOpen((o) => !o)}
              className="w-9 h-9 flex flex-col items-center justify-center gap-[5px] bg-transparent border-0 cursor-pointer rounded-lg hover:bg-ink-50 transition-colors"
              aria-label="Toggle menu"
            >
              <span
                className={`block w-5 h-[2px] bg-ink-700 rounded-full transition-all duration-200 ${menuOpen ? "rotate-45 translate-y-[7px]" : ""}`}
              />
              <span
                className={`block w-5 h-[2px] bg-ink-700 rounded-full transition-all duration-200 ${menuOpen ? "opacity-0" : ""}`}
              />
              <span
                className={`block w-5 h-[2px] bg-ink-700 rounded-full transition-all duration-200 ${menuOpen ? "-rotate-45 -translate-y-[7px]" : ""}`}
              />
            </button>
          </div>
        </div>

        {/* Mobile dropdown menu */}
        {menuOpen && (
          <div className="md:hidden pb-4 border-t border-ink-100 pt-4 flex flex-col gap-1">
            <DropDownNavItems dropdownStyle="font-extrabold text-slate-800 hover:text-fb-green transition-colors duration-200 py-2.5 px-2 text-[15px]" />
            {navItems.map((item) => (
              <Link
                key={item.name}
                to={item.link}
                className="text-[15px] font-semibold text-slate-800 hover:text-fb-green transition-colors py-2.5 px-2"
                onClick={() => setMenuOpen(false)}
              >
                {item.name}
              </Link>
            ))}
            <div className="flex flex-col gap-2.5 mt-3 pt-3 border-t border-ink-100">
              {hasSession ? (
                <Link to={"/dashboard"} onClick={() => setMenuOpen(false)}>
                  <Button
                    className="w-full bg-transparent font-extrabold text-base text-ink-800 border border-ink-200 py-3 px-[22px] rounded-xl hover:border-fb-green hover:text-fb-green transition-colors cursor-pointer"
                    size="lg"
                  >
                    Dashboard
                  </Button>
                </Link>
              ) : (
                <>
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      navigate({ to: "/login" });
                    }}
                    className="w-full bg-transparent font-extrabold text-base text-ink-800 border border-ink-200 py-3 px-[22px] rounded-xl hover:border-fb-green hover:text-fb-green transition-colors cursor-pointer"
                  >
                    Login
                  </button>
                  <BookDemoModal>
                    <button className="w-full inline-flex items-center justify-center gap-2 border-0 rounded-2xl font-extrabold text-sm py-3 px-5 text-[#0F2820] bg-periwinkle hover:bg-periwinkle-2 transition-all cursor-pointer">
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
