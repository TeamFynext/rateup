"use client";

import { useState } from "react";

import { Link } from "@tanstack/react-router";
import { Image } from "@unpic/react";
import { Menu, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

import { BookDemoModal } from "@/components/RateupHomePage/helper/BookDemoModal.tsx";
import DropDownMobileNavItems from "@/components/RateupHomePage/helpers/DropDownMobileNavItems.tsx";
import DropDownNavItems from "@/components/RateupHomePage/helpers/DropDownNavItems.tsx";
import { Button } from "@/components/ui/button.tsx";
import { rateupLogoBlue } from "@/utils/constants.ts";

const navLinks = [
  { label: "Features", href: "#features" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "For Businesses", href: "#businesses" },
  { label: "Integrations", href: "#integrations" },
];

const LoyalityHeader = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="bg-[#f0fdf4] border-b border-[#dbede3] py-6 px-6 lg:px-10 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        {/* Logo */}
        <Link to="https://rateup.app" className="flex items-center gap-2">
          <Image src={rateupLogoBlue} alt="logo" height={50} width={60} />
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center space-x-10">
          <DropDownNavItems />
          {navLinks.map((link) => (
            <Link
              key={link.href}
              to={link.href}
              className="text-[16px] font-medium text-gray-700 hover:text-black transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* CTA Buttons */}
        <div className="hidden  md:flex items-center space-x-4">
          <BookDemoModal>
            <Button
              variant="outline"
              className=" cursor-pointer rounded-lg text-base py-2.5"
            >
              Book a Demo
            </Button>
          </BookDemoModal>
          <Link to="https://rateup.app/login">
            <Button className="w-full cursor-pointer rounded-lg text-base py-2.5 bg-[#009987] hover:bg-[#009987] text-white">
              Start Free
            </Button>
          </Link>
        </div>

        {/* Mobile Toggle */}
        <button
          className="md:hidden"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          aria-label="Toggle Menu"
        >
          {isMenuOpen ? <X size={28} /> : <Menu size={28} />}
        </button>
      </div>

      {/* Mobile Dropdown */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            key="mobile-menu"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }}
            className="md:hidden absolute top-[4.5rem] left-0 right-0 bg-white z-40 border-t border-gray-200 shadow-md"
          >
            <div className="flex flex-col px-6 py-4 space-y-4">
              <DropDownMobileNavItems />
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  to={link.href}
                  onClick={() => setIsMenuOpen(false)}
                  className="text-base font-medium text-gray-700 hover:text-black py-2"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};

export default LoyalityHeader;
