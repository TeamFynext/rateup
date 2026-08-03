import { IconMenu, IconX } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { Image } from "@unpic/react";
import { useState } from "react";

import DropDownMobileNavItems from "@/components/RateupHomePage/helpers/DropDownMobileNavItems.tsx";
import DropDownNavItems from "@/components/RateupHomePage/helpers/DropDownNavItems.tsx";
import { Button } from "@/components/ui/button.tsx";
import { rateupLogoStackedWhiteTransparent } from "@/utils/constants.ts";

const links = [
  { name: "Features", href: "#features" },
  { name: "How it Works", href: "#use-cases" },
  { name: "Reputation Management", href: "#reputation-management" },
  { name: "Pricing", href: "/price" },
];

const ReviewAiHeader = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-[rgba(255,255,255,0.8)] backdrop-blur-md border-b border-[#f3f4f6]">
      <div className="container mx-auto max-w-7xl px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <a href="https://rateup.app" className="flex items-center gap-2">
              <Image src={rateupLogoStackedWhiteTransparent} alt="logo" height={50} width={60} />
            </a>
          </div>

          {/* Desktop Navigation */}
          <nav aria-label="Main" className="hidden md:flex items-center gap-6">
            <DropDownNavItems />
            {links.map((link, index) => (
              <Link
                key={index}
                to={link.href}
                className="text-[#374151] hover:text-[#009987] text-md font-medium transition-colors"
              >
                {link.name}
              </Link>
            ))}
          </nav>

          <a href={"https://rateup.app/login"} className="hidden md:flex items-center gap-4">
            <Button className="bg-[#009987] cursor-pointer hover:bg-[#009987] text-[#FFFFFF]">
              Get Started
            </Button>
          </a>

          {/* Mobile Menu Button */}
          <button className="md:hidden" onClick={() => setIsMenuOpen(!isMenuOpen)}>
            {isMenuOpen ? <IconX className="w-6 h-6" /> : <IconMenu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <nav aria-label="Mobile" className="md:hidden mt-4 py-4 border-t border-[#f3f4f6]">
            <div className="flex flex-col gap-4">
              <DropDownMobileNavItems />
              {links.map((link, index) => (
                <Link
                  key={index}
                  to={link.href}
                  className="text-[#374151] hover:text-[#009987] font-medium transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {link.name}
                </Link>
              ))}
              <div className="flex flex-col gap-3 pt-4 border-t border-[#f3f4f6]">
                <Button className="bg-[#009987] hover:bg-[#009987]] text-[#FFFFFF] w-full">
                  Get Started
                </Button>
              </div>
            </div>
          </nav>
        )}
      </div>
    </header>
  );
};

export default ReviewAiHeader;
