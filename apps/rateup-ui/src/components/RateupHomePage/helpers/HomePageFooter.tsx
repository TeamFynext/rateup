import {
  IconBrandFacebook,
  IconBrandInstagram,
  IconBrandLinkedin,
  IconBrandPinterestFilled,
  IconBrandThreads,
  IconBrandX,
  IconBrandYoutube,
} from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { Image } from "@unpic/react";

import { rateupLogoStackedTransparent } from "@/utils/constants";

const HomePageFooter = () => {
  return (
    <footer className="bg-white text-gray-800 pt-16 pb-8 border-t border-gray-200">
      <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-12">
        {/* Logo & Social */}
        <div className="flex flex-col items-center md:items-start">
          <Link to="/" className="mb-4">
            <Image
              src={rateupLogoStackedTransparent}
              alt="RateUp Logo"
              width={56}
              height={56}
              className="w-14 h-14 object-contain"
            />
          </Link>
          <p className="mb-3 font-medium">Follow Us On:</p>
          <div className="flex gap-4">
            <Link to="https://x.com/rateup_app" aria-label="X" target="_blank">
              <IconBrandX className="w-6 h-6 text-gray-800 hover:text-black transition" />
            </Link>
            <Link
              to="https://www.instagram.com/rateupsoftware/"
              aria-label="Instagram"
              target="_blank"
            >
              <IconBrandInstagram className="w-6 h-6 text-pink-500 hover:text-pink-700 transition" />
            </Link>

            <Link
              to="https://www.facebook.com/rateupsapp/"
              aria-label="Facebook"
              target="_blank"
            >
              <IconBrandFacebook className="w-6 h-6 text-blue-600 hover:text-blue-800 transition" />
            </Link>
            <Link
              to="https://www.linkedin.com/company/rateup"
              aria-label="LinkedIn"
              target="_blank"
            >
              <IconBrandLinkedin className="w-6 h-6 text-blue-700 hover:text-blue-900 transition" />
            </Link>

            <Link
              to="https://www.threads.com/@rateupsoftware"
              aria-label="Threads"
              target="_blank"
            >
              <IconBrandThreads className="w-6 h-6 text-gray-800 hover:text-black transition" />
            </Link>
            <Link
              to="https://www.youtube.com/@TeamRateup"
              aria-label="Youtube"
              target="_blank"
            >
              <IconBrandYoutube className="w-6 h-6 text-red-600 hover:text-red-800 transition" />
            </Link>
            <Link
              to="https://www.pinterest.com/rateupapp/"
              aria-label="Pinterest"
              target="_blank"
            >
              <IconBrandPinterestFilled className="w-6 h-6 text-red-600 hover:text-red-800 transition" />
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
                layout="fullWidth"
                aspectRatio={3}
                objectFit="contain"
                className="object-contain"
              />
            </div>
            <div className="relative h-6 w-20">
              <Image
                src="https://djd7kjh9uwow0.cloudfront.net/images/homepage/footer-logos/meta-business-partner-logo.png"
                alt="Meta"
                layout="fullWidth"
                aspectRatio={20 / 6}
                objectFit="contain"
                className="object-contain"
              />
            </div>
            <div className="relative h-4 mt-1 w-24">
              <Image
                src="https://djd7kjh9uwow0.cloudfront.net/images/homepage/footer-logos/startup-india.png"
                alt="Startup India"
                layout="fullWidth"
                aspectRatio={6}
                objectFit="contain"
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
              <Link to="/about-us" className="hover:text-black transition">
                About Us
              </Link>
            </li>
            <li>
              <Link to="/contact-us" className="hover:text-black transition">
                Contact Us
              </Link>
            </li>
            <li>
              <Link to="/blog" className="hover:text-black transition">
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
                <Link to="/pricing" className="hover:text-black transition">
                  Basic Plan
                </Link>
              </li>
              <li>
                <Link to="/pricing" className="hover:text-black transition">
                  Plus Plan
                </Link>
              </li>
              <li>
                <Link to="/pricing" className="hover:text-black transition">
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
                  to="/privacy-policy"
                  className="hover:text-black transition"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link
                  to="/terms-of-service"
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
        &copy; 2026 RateUp. All rights reserved.
      </div>
    </footer>
  );
};

export default HomePageFooter;
