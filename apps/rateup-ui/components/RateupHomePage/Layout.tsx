"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { useCheckSession } from "@/hooks/checkSession";
import {
  MobileNav,
  MobileNavHeader,
  MobileNavMenu,
  MobileNavToggle,
  Navbar,
  NavBody,
  NavItems,
} from "@/components/ui/resizable-navbar";
import { imagesPath } from "@/utils/constants";

import CookieConsentBanner from "../Analytics/CookieConsentBanner";
import { BookDemoModal } from "./helper/BookDemoModal";
import DropDownMobileNavItems from "./helpers/DropDownMobileNavItems";

interface LayoutProps {
  children: React.ReactNode;
  isBlog?: boolean;
}

const homePageJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "RateUp",
  url: "https://rateup.app",
  logo: "https://djd7kjh9uwow0.cloudfront.net/images/rateup-logo-blue-text.svg",
  description:
    "RateUp is an AI-powered omnichannel customer engagement platform that integrates WhatsApp Business API, feedback, loyalty, chat automation, and a unified inbox to help businesses boost retention and repeat sales.",
  foundingDate: "2023",
  contactPoint: [
    {
      "@type": "ContactPoint",
      contactType: "customer support",
      email: "hello@rateup.app",
    },
  ],
  sameAs: [
    "https://www.linkedin.com/company/rateupapp",
    "https://twitter.com/rateupapp",
    "https://www.instagram.com/rateupapp",
    "https://www.facebook.com/rateupapp",
    "https://www.threads.com/@rateupsoftware",
    "https://www.youtube.com/@TeamRateup",
  ],
  brand: {
    "@type": "Brand",
    name: "RateUp",
    logo: "https://djd7kjh9uwow0.cloudfront.net/images/rateup-logo-blue-text.svg",
  },
  aggregateRating: {
    "@type": "AggregateRating",
    ratingValue: "5",
    reviewCount: "3987",
    bestRating: "5",
  },
};

export default function Layout({ children, isBlog }: Readonly<LayoutProps>) {
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
  const router = useRouter();

  return (
    <div className={`${!isBlog && "bg-rateup-darkblue"} relative w-full `}>
      <Navbar>
        {/* Desktop Navigation */}
        <NavBody className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 ">
          <Link
            href="/"
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
              <Link
                href={"/dashboard"}
                className="px-6 relative py-1.5 rounded-lg border font-medium 
               border-rateup-blue-4 bg-rateup-blue-4
              text-white transition"
              >
                Dashboard
              </Link>
            </div>
          ) : (
            <div className="flex items-center gap-4 justify-center">
              <Link
                href={"/signup"}
                className="px-4 text-[14px] relative py-2 rounded-xl border font-semibold border-rateup-blue-4 bg-rateup-blue-2 text-white transition"
              >
                Start Free Trial
              </Link>
              <BookDemoModal>
                <button className="bg-rateup-light-blue px-4 py-2 rounded-xl text-rateup-dark-blue cursor-pointer hover:bg-rateup-darkblue-2">
                  <span className="font-semibold text-[14px]">Book A Demo</span>
                </button>
              </BookDemoModal>
              <button
                onClick={() => router.push("/login")}
                className="px-10 flex items-center justify-center rounded-xl cursor-pointer
             text-rateup-blue border border-rateup-light-blue hover:bg-rateup-blue-4
             hover:text-white transition bg-white py-2"
              >
                <span className="font-semibold text-[14px]">Login</span>
              </button>
            </div>
          )}
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
                  href={item.link}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="py-3 text-lg text-neutral-700 hover:text-rateup-blue-4"
                >
                  {item.name}
                </Link>
              ))}

              <div className="mt-6 flex flex-col gap-3">
                <Link
                  href={"https://rateup.app/login"}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="px-6 py-2 border text-rateup-blue-4 text-center border-rateup-blue-4 rounded hover:bg-rateup-blue-4 hover:text-white transition"
                >
                  Login
                </Link>

                <Link
                  href={"https://rateup.app/signup"}
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
      {children}
      <CookieConsentBanner />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(homePageJsonLd).replace(/</g, "\\u003c"),
        }}
      />
    </div>
  );
}
