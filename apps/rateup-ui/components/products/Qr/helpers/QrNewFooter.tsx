import Image from "next/image";
import Link from "next/link";

import { rateupLogoBlue } from "@/utils/constants";

export const QrNewFooter = () => {
  return (
    <footer className="bg-white border-t border-gray-200 px-4 py-16">
      <div className="max-w-7xl mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          {/* Logo */}
          <Image
            src={rateupLogoBlue}
            alt="RateUp Logo"
            width={100}
            height={40}
            priority
          />

          {/* Our Company */}
          <div>
            <h4 className="text-sm font-semibold text-gray-800 mb-3">
              Our Company
            </h4>
            <ul className="space-y-2 text-sm text-gray-700">
              <li>
                <Link href="/about-us" className="hover:text-gray-900">
                  About Us
                </Link>
              </li>
              <li>
                <Link href="/contact-us" className="hover:text-gray-900">
                  Contact Us
                </Link>
              </li>
              <li>
                <Link
                  href="https://blog.rateup.app/"
                  className="hover:text-gray-900"
                >
                  Blog
                </Link>
              </li>
            </ul>
          </div>

          {/* Pricing & Legal */}
          <div className="flex flex-col sm:flex-row sm:justify-between gap-6">
            <div>
              <h4 className="text-sm font-semibold text-gray-800 mb-3">
                Pricing
              </h4>
              <ul className="space-y-2 text-sm text-gray-700">
                <li>
                  <Link href="/pricing" className="hover:text-gray-900">
                    Basic Plan
                  </Link>
                </li>
                <li>
                  <Link href="/pricing" className="hover:text-gray-900">
                    Plus Plan
                  </Link>
                </li>
                <li>
                  <Link href="/pricing" className="hover:text-gray-900">
                    Premium Plan
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-gray-800 mb-3">
                Legal
              </h4>
              <ul className="space-y-2 text-sm text-gray-700">
                <li>
                  <Link href="/privacy-policy" className="hover:text-gray-900">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link
                    href="/terms-of-service"
                    className="hover:text-gray-900"
                  >
                    Terms of Service
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default QrNewFooter;
