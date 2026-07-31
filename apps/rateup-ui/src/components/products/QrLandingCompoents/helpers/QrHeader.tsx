import { IconMenu, IconX } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { Image } from "@unpic/react";
import { useState } from "react";

import { BookDemoModal } from "@/components/RateupHomePage/helper/BookDemoModal.tsx";
import DropDownMobileNavItems from "@/components/RateupHomePage/helpers/DropDownMobileNavItems.tsx";
import DropDownNavItems from "@/components/RateupHomePage/helpers/DropDownNavItems.tsx";
import { Button } from "@/components/ui/button.tsx";
import { rateupLogoStackedWhiteTransparent } from "@/utils/constants.ts";

const QrHeader = () => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  const navLinks = [
    { text: "Features", href: "#features" },
    { text: "How It Works", href: "#how-it-works" },
    { text: "Platform", href: "#platform" },
    { text: "Pricing", href: "/pricing" },
  ];

  return (
    <header className="sticky top-0 w-full bg-white/70 backdrop-blur-xl z-50 border-b border-gray-200 shadow-sm transition-all">
      <div className="mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-20 items-center justify-between">
          <div className="flex items-center">
            <a href="https://rateup.app" className="flex items-center gap-2">
              <Image src={rateupLogoStackedWhiteTransparent} alt="logo" height={50} width={60} />
            </a>
          </div>

          <nav className="hidden md:flex items-center gap-10">
            <DropDownNavItems />
            {navLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className="text-base font-medium text-gray-800 hover:text-[#0041a8] transition-colors duration-300"
              >
                {link.text}
              </Link>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-4">
            <a href="https://rateup.app/login">
              <Button
                variant="outline"
                className="text-gray-700 hover:text-[#1c518e] cursor-pointer transition-colors duration-300"
              >
                Log in
              </Button>
            </a>
            <BookDemoModal>
              <Button className="bg-[#1c518e] cursor-pointer text-white hover:bg-[#1c518e] transition-colors duration-300 shadow-md">
                Get Started
              </Button>
            </BookDemoModal>
          </div>

          <div className="md:hidden">
            <button
              className="inline-flex items-center justify-center p-2 rounded-md
               text-gray-700 hover:text-[#1c518e] transition-colors duration-300"
              onClick={toggleMenu}
            >
              {isOpen ? <IconX className="h-6 w-6" /> : <IconMenu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isOpen && (
        <div className="md:hidden bg-white border-t border-gray-100">
          <div className="px-4 pt-4 pb-2 space-y-2">
            <DropDownMobileNavItems />
            {navLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className="block px-4 py-2 rounded-md text-base font-medium text-gray-800 hover:text-[#1c518e] transition-colors duration-300"
                onClick={() => setIsOpen(false)}
              >
                {link.text}
              </Link>
            ))}
          </div>
          <div className="pt-4 pb-4 border-t border-gray-200 px-4">
            <Link to="/login">
              <Button
                variant="ghost"
                className="w-full justify-center text-gray-700 hover:text-[#1c518e] transition-colors duration-300"
              >
                Log in
              </Button>
            </Link>
            <a href="/get-started">
              <Button className="mt-3 w-full bg-[#1c518e] text-white hover:bg-[#1c518e] transition-colors duration-300 shadow-sm">
                Get Started
              </Button>
            </a>
          </div>
        </div>
      )}
    </header>
  );
};

export default QrHeader;
