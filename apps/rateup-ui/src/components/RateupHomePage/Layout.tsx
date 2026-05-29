"use client";

import { useState } from "react";

import { Link, useNavigate } from "@tanstack/react-router";
import { Image } from "@unpic/react";

import { useCheckSession } from "@/hooks/checkSession.tsx";
import {
  MobileNav,
  MobileNavHeader,
  MobileNavMenu,
  MobileNavToggle,
  Navbar,
  NavBody,
  NavItems,
} from "@/components/ui/resizable-navbar.tsx";
import { imagesPath } from "@/utils/constants.ts";
import { fbConsent } from "@/utils/fbpixel.ts";
import { setGAConsent } from "@/utils/gtag.ts";

import { Button } from "../ui/button.tsx";
import { CookieConsent } from "../ui/cookie-consent.tsx";
import { BookDemoModal } from "./helper/BookDemoModal.tsx";
import DropDownMobileNavItems from "./helpers/DropDownMobileNavItems.tsx";

interface LayoutProps {
  children: React.ReactNode;
  isBlog?: boolean;
  navbarClassName?: string;
}

export default function Layout({
  children,
  isBlog,
  navbarClassName,
}: Readonly<LayoutProps>) {
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
    <div
      className={`relative w-full py-2 ${
        navbarClassName || (!isBlog ? "bg-rateup-darkblue" : "")
      }`}
    >
      {" "}
      <Navbar>
        {/* Desktop Navigation */}
        <NavBody className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 ">
          <Link
            to="/"
            className="relative z-20 mr-4 flex items-center
             space-x-2 px-2 py-1 text-sm font-normal text-black"
          >
            <Image
              src={rateupLogoUrl}
              alt="RateUp logo"
              width={140}
              height={60}
              className="h-9 w-auto object-contain"
              priority
            />
          </Link>
          <NavItems items={navItems} />
          {hasSession ? (
            <div className="flex  items-center gap-4">
              <Link to={"/dashboard"}>
                <Button
                  className="font-medium 
               border-rateup-blue-4 bg-rateup-blue-4
              text-white transition"
                  size="lg"
                >
                  Dashboard
                </Button>
              </Link>
            </div>
          ) : (
            <div className="flex items-center gap-4 justify-center">
              <Link
                to={"/signup"}
                // className="px-4 text-[14px] relative py-2 rounded-xl border font-semibold border-rateup-blue-4 bg-rateup-blue-5 text-white transition"
              >
                <Button
                  className="border-rateup-blue-4 bg-rateup-blue-5 text-white transition"
                  size="lg"
                >
                  <span className="font-semibold text-[14px]">
                    Start Free Trial
                  </span>
                </Button>
              </Link>
              <BookDemoModal>
                <Button
                  className="bg-rateup-light-blue text-rateup-dark-blue hover:bg-rateup-darkblue-2 hover:text-white transition"
                  size="lg"
                >
                  <span className="font-semibold text-[14px]">Book A Demo</span>
                </Button>
              </BookDemoModal>
              <Button
                onClick={() =>
                  navigate({
                    to: "/login",
                  })
                }
                size="lg"
                variant="outline"
                className="px-10 text-rateup-blue border border-rateup-light-blue hover:bg-rateup-blue-4 hover:text-white transition bg-white"
              >
                <span className="font-semibold text-[14px]">Login</span>
              </Button>
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
              <Image
                src={rateupLogoUrl}
                alt="logo"
                width={70}
                height={30}
                className="w-14 h-10"
                priority
              />
            </Link>
            <MobileNavToggle
              isOpen={isMobileMenuOpen}
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            />
          </MobileNavHeader>

          <MobileNavMenu
            isOpen={isMobileMenuOpen}
            onClose={() => setIsMobileMenuOpen(false)}
          >
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
                <a
                  href="https://rateup.app/login"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="px-6 py-2 border text-rateup-blue-4 text-center border-rateup-blue-4 rounded hover:bg-rateup-blue-4 hover:text-white transition"
                >
                  Login
                </a>

                <a
                  href="https://rateup.app/signup"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="px-6 py-2 bg-rateup-blue-4 text-center text-white rounded hover:opacity-90 transition"
                >
                  SignUp
                </a>
              </div>
            </div>
          </MobileNavMenu>
        </MobileNav>
      </Navbar>
      {children}
      <CookieConsent
        variant="small"
        onAcceptCallback={() => {
          setGAConsent("granted");
          fbConsent("grant");
        }}
        onDeclineCallback={() => {
          setGAConsent("denied");
          fbConsent("revoke");
        }}
      />
    </div>
  );
}
