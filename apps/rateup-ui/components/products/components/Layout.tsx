"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";

import { Loader } from "lucide-react";
import { useSessionContext } from "supertokens-auth-react/recipe/session";

import DropDownMobileNavItems from "@/components/RateupHomePage/helpers/DropDownMobileNavItems";
import {
  MobileNav,
  MobileNavHeader,
  MobileNavMenu,
  MobileNavToggle,
  Navbar,
  NavBody,
  NavItems,
} from "@/components/ui/resizable-navbar";
import { rateupLogoBlue } from "@/utils/constants";

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: Readonly<LayoutProps>) {
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
      link: "https://blog.rateup.app/",
    },
  ];

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const sessionContext = useSessionContext();

  let mobileNavButtonContent;
  let largeScreenNavButtonContent;
  if (sessionContext?.loading) {
    mobileNavButtonContent = (
      <div>
        <Loader className="animate-spin" />
      </div>
    );
    largeScreenNavButtonContent = (
      <div>
        <Loader className="animate-spin" />
      </div>
    );
    //@ts-ignore
  } else if (sessionContext?.doesSessionExists) {
    mobileNavButtonContent = (
      <Link
        href={"https://rateup.app/dashboard"}
        onClick={() => setIsMobileMenuOpen(false)}
        className="relative cursor-pointer px-6 py-2 bg-[#1c518e] text-center text-white rounded hover:opacity-90 transition"
      >
        Dashboard
      </Link>
    );
    largeScreenNavButtonContent = (
      <Link
        href={"https://rateup.app/dashboard"}
        className="relative cursor-pointer px-6 py-2 bg-[#1c518e] text-center text-white rounded hover:opacity-90 transition"
      >
        Dashboard
      </Link>
    );
  } else {
    mobileNavButtonContent = (
      <>
        <Link
          href={"https://rateup.app/login"}
          onClick={() => setIsMobileMenuOpen(false)}
          className="px-6 py-2 border text-[#1c518e] text-center border-[#1c518e] rounded hover:bg-[#1c518e] hover:text-white transition"
        >
          Login
        </Link>

        <Link
          href={"https://rateup.app/signup"}
          onClick={() => setIsMobileMenuOpen(false)}
          className="px-6 py-2 bg-[#1c518e] text-center text-white rounded hover:opacity-90 transition"
        >
          SignUp
        </Link>
      </>
    );
    largeScreenNavButtonContent = (
      <>
        <Link
          href="https://rateup.app/login"
          className="px-4 py-1.5 font-medium relative rounded-lg border cursor-pointer
             text-[#1c518e] border-[#1c518e] hover:bg-[#1c518e]
             hover:text-white transition inline-block"
        >
          Login
        </Link>
        <Link
          href={"https://rateup.app/signup"}
          className="px-6 relative py-1.5 rounded-lg border font-medium 
               border-[#1c518e] bg-[#1c518e]
              text-white transition"
        >
          SignUp
        </Link>
      </>
    );
  }

  return (
    <div className="relative w-full">
      <Navbar>
        {/* Desktop Navigation */}
        <NavBody>
          <Link
            href="/"
            className="relative z-20 mr-4 flex items-center
             space-x-2 px-2 py-1 text-sm font-normal text-black"
          >
            <Image
              src={rateupLogoBlue}
              alt="logo"
              width={70}
              height={30}
              className="w-14 h-14"
              priority
            />
          </Link>
          <NavItems items={navItems} />

          <div className="flex  items-center gap-4">
            {largeScreenNavButtonContent}
          </div>
        </NavBody>

        {/* Mobile Navigation */}
        <MobileNav>
          <MobileNavHeader>
            <Link
              href="/"
              className="relative z-20 mr-4 flex items-center 
              space-x-2 lg:px-8 px-2 py-1 text-sm font-normal text-black"
            >
              <Image
                src={rateupLogoBlue}
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
                <Image src={rateupLogoBlue} alt="logo" width={60} height={30} />
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
                  href={item.link}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="py-3 text-lg text-neutral-700 hover:text-[#1c518e]"
                >
                  {item.name}
                </Link>
              ))}

              <div className="mt-6 flex flex-col gap-3">
                {mobileNavButtonContent}
              </div>
            </div>
          </MobileNavMenu>
        </MobileNav>
      </Navbar>

      {children}
    </div>
  );
}
