import Image from "next/image";
import Link from "next/link";

import {
  IconBrandFacebook,
  IconBrandInstagram,
  IconBrandLinkedin,
} from "@tabler/icons-react";

import { rateupLogoBlueTextUrl } from "@/components/HomePage/constants";

const HomePageFooter = () => {
  return (
    <footer className="bg-white text-gray-800 pt-16 pb-8 border-t border-gray-200">
      <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-12">
        {/* Logo & Social */}
        <div className="flex flex-col items-center md:items-start">
          <Link href="/" className="mb-4">
            <Image
              src={rateupLogoBlueTextUrl}
              alt="RateUp Logo"
              width={56}
              height={56}
              className="w-14 h-14 object-contain"
              priority
            />
          </Link>
          <p className="mb-3 font-medium">Follow Us On:</p>
          <div className="flex gap-4">
            <Link
              href="https://www.linkedin.com/company/rateup"
              aria-label="LinkedIn"
            >
              <IconBrandLinkedin className="w-6 h-6 text-blue-700 hover:text-blue-900 transition" />
            </Link>
            <Link
              href="https://www.instagram.com/rateupsoftware/"
              aria-label="Instagram"
            >
              <IconBrandInstagram className="w-6 h-6 text-pink-500 hover:text-pink-700 transition" />
            </Link>
            <Link
              href="https://www.facebook.com/people/RateUp/61556199852468/"
              aria-label="Facebook"
            >
              <IconBrandFacebook className="w-6 h-6 text-blue-600 hover:text-blue-800 transition" />
            </Link>
          </div>
        </div>

        {/* Partner Logos */}
        <div className="flex flex-col items-center md:items-start gap-3">
          <p className="mb-2 font-medium">Our Partners</p>
          <div className="flex gap-4 flex-wrap justify-center md:justify-start">
            <div className="relative h-8 w-24">
              <Image
                src="https://djd7kjh9uwow0.cloudfront.net/images/homepage/footer-logos/kerala-startup-mission-logo.png"
                alt="KSUM"
                fill
                className="object-contain"
              />
            </div>
            <div className="relative h-6 w-20">
              <Image
                src="https://djd7kjh9uwow0.cloudfront.net/images/homepage/footer-logos/meta-business-partner-logo.png"
                alt="Meta"
                fill
                className="object-contain"
              />
            </div>
            <div className="relative h-4 mt-1 w-24">
              <Image
                src="https://djd7kjh9uwow0.cloudfront.net/images/homepage/footer-logos/startup-india.png"
                alt="Startup India"
                fill
                className="object-contain"
              />
            </div>
          </div>
        </div>

        {/* Our Company */}
        <div>
          <h4 className="text-lg font-semibold mb-3">Our Company</h4>
          <ul className="space-y-2 text-sm text-gray-600">
            <li>
              <Link href="/about-us" className="hover:text-black transition">
                About Us
              </Link>
            </li>
            <li>
              <Link href="/contact-us" className="hover:text-black transition">
                Contact Us
              </Link>
            </li>
            <li>
              <Link
                href="https://blog.rateup.app/"
                className="hover:text-black transition"
              >
                Blog
              </Link>
            </li>
          </ul>
        </div>

        {/* Pricing & Legal */}
        <div className="grid grid-cols-2 gap-6">
          <div>
            <h4 className="text-lg font-semibold mb-3">Pricing</h4>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>
                <Link href="/pricing" className="hover:text-black transition">
                  Basic Plan
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="hover:text-black transition">
                  Plus Plan
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="hover:text-black transition">
                  Premium Plan
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="text-lg font-semibold mb-3">Legal</h4>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>
                <Link
                  href="/privacy-policy"
                  className="hover:text-black transition"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link
                  href="/terms-of-service"
                  className="hover:text-black transition"
                >
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Copyright */}
      <div className="mt-12 text-center text-xs text-gray-500">
        &copy; 2025 RateUp. All rights reserved.
      </div>
    </footer>
  );
};

export default HomePageFooter;
