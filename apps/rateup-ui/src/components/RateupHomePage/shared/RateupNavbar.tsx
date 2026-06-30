import { Link, useNavigate } from "@tanstack/react-router";
import { Image } from "@unpic/react";
import { useState } from "react";

import {
  MobileNav,
  MobileNavHeader,
  MobileNavMenu,
  MobileNavToggle,
  Navbar,
  NavBody,
  NavItems,
} from "@/components/ui/resizable-navbar.tsx";
import { useCheckSession } from "@/hooks/checkSession.tsx";
import { imagesPath, rateupLogoHorizontalTransparent } from "@/utils/constants.ts";

import { RateupStar } from "../../integrations/logos.tsx";
import { BookDemoModal } from "../helper/BookDemoModal.tsx";
import DropDownMobileNavItems from "../helpers/DropDownMobileNavItems.tsx";

import styles from "@/styles/commonCssModules/homepagecss.module.css";

export default function RateupNavbar() {
  const hasSession = useCheckSession();
  const rateupLogoUrl = `${imagesPath}/rateupLogo.svg`;
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

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <Navbar>
      {/* Desktop Navigation */}
      <NavBody className="w-full mx-auto px-4 sm:px-6 lg:px-8 py-4 ">
        <Link
          to="/"
          className="relative z-20 mr-4 flex items-center
         space-x-2 px-2 py-1 text-sm font-normal text-black"
        >
          <span className={styles.brand}>
            <RateupStar className="h-8 w-8" />
            <span className={styles.wm}>
              Rate
              <span className={styles.up}>Up</span>
            </span>
          </span>
        </Link>
        <NavItems items={navItems} className="flex-none" />
        {hasSession ? (
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate({ to: "/dashboard" })}
              className="inline-flex items-center gap-3 border-0 rounded-2xl font-extrabold text-sm tracking-[-0.01em] pl-4.5 py-1.25 pr-1.25 text-white bg-[linear-gradient(135deg,var(--btn-primary-start),var(--btn-primary-end))] shadow-[0_10px_26px_var(--btn-primary-shadow)] hover:shadow-[0_14px_34px_var(--btn-primary-hover-shadow)] hover:-translate-y-0.5 active:scale-[0.97] transition-all cursor-pointer whitespace-nowrap"
            >
              <span style={{ paddingRight: 2 }}>Dashboard</span>
              <span className="inline-flex items-center justify-center w-7.5 h-7.5 rounded-xl bg-(--btn-primary-chip-bg) shrink-0">
                <svg
                  className="w-3.75 h-3.75"
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
          </div>
        ) : (
          <div className="flex items-center gap-4 justify-center">
            <button
              onClick={() => navigate({ to: "/login" })}
              style={{
                borderColor: "var(--nav-btn-border, var(--nav-btn-ghost-border))",
                color: "var(--nav-btn-text, var(--nav-btn-ghost-text))",
              }}
              className="bg-transparent font-extrabold text-[15px] border py-2.5 px-5 rounded-2xl hover:border-(--nav-link-hover) hover:text-(--nav-link-hover) transition-colors cursor-pointer whitespace-nowrap"
            >
              Sign In
            </button>
            <BookDemoModal>
              <button
                style={{
                  backgroundColor: "var(--btn-demo-bg)",
                  border: "1px solid var(--btn-demo-border)",
                  color: "var(--btn-demo-text)",
                }}
                className="inline-flex items-center gap-3 rounded-2xl font-extrabold text-sm pl-4.5 py-1.25 pr-1.25 hover:bg-(--btn-demo-hover-bg) hover:-translate-y-0.5 active:scale-[0.97] transition-all cursor-pointer whitespace-nowrap"
              >
                <span style={{ paddingRight: 2 }}>Book a Demo</span>
                <span className="inline-flex items-center justify-center w-7.5 h-7.5 rounded-xl bg-white/65 shrink-0 text-slate-800">
                  <svg
                    className="w-3.75 h-3.75"
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
            <button
              onClick={() => navigate({ to: "/signup" })}
              className="inline-flex items-center gap-3 border-0 rounded-2xl font-extrabold text-sm tracking-[-0.01em] pl-4.5 py-1.25 pr-1.25 text-white bg-[linear-gradient(135deg,var(--btn-primary-start),var(--btn-primary-end))] shadow-[0_10px_26px_var(--btn-primary-shadow)] hover:shadow-[0_14px_34px_var(--btn-primary-hover-shadow)] hover:-translate-y-0.5 active:scale-[0.97] transition-all cursor-pointer whitespace-nowrap"
            >
              <span style={{ paddingRight: 2 }}>Sign Up for Free</span>
              <span className="inline-flex items-center justify-center w-7.5 h-7.5 rounded-xl bg-(--btn-primary-chip-bg) shrink-0">
                <svg
                  className="w-3.75 h-3.75"
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
          </div>
        )}
      </NavBody>

      {/* Mobile Navigation */}
      <MobileNav>
        <MobileNavHeader>
          <Link
            to="/"
            className="relative z-20 mr-4 flex items-center 
          space-x-2 lg:px-8 px-2 py-1 text-sm font-normal text-black"
          >
            <Image src={rateupLogoHorizontalTransparent} alt="logo" width={100} height={30} />
          </Link>
          <MobileNavToggle
            isOpen={isMobileMenuOpen}
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          />
        </MobileNavHeader>

        <MobileNavMenu isOpen={isMobileMenuOpen}>
          <div
            className={`fixed top-0 left-0 w-full rounded-xl bg-white z-50 flex flex-col p-6 transform transition-transform duration-300 ease-in-out ${
              isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
            }`}
          >
            <div className="flex justify-between items-center mb-6">
              <Image src={rateupLogoUrl} alt="logo" width={60} height={30} />
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="text-2xl font-bold"
                aria-label="Close menu"
              >
                ✕
              </button>
            </div>

            <DropDownMobileNavItems />
            {navItems.map((item, idx) => (
              <Link
                key={`mobile-link-${idx}`}
                to={item.link}
                onClick={() => setIsMobileMenuOpen(false)}
                className="py-3 text-lg text-neutral-700 hover:text-rateup-blue-4"
              >
                {item.name}
              </Link>
            ))}

            <div className="mt-6 flex flex-col gap-3">
              <Link
                to="/login"
                onClick={() => setIsMobileMenuOpen(false)}
                className="px-6 py-2 border text-rateup-blue-4 text-center border-rateup-blue-4 rounded hover:bg-rateup-blue-4 hover:text-white transition"
              >
                Login
              </Link>

              <Link
                to="/signup"
                onClick={() => setIsMobileMenuOpen(false)}
                className="px-6 py-2 bg-rateup-blue-4 text-center text-white rounded hover:opacity-90 transition"
              >
                SignUp
              </Link>
            </div>
          </div>
        </MobileNavMenu>
      </MobileNav>
    </Navbar>
  );
}
