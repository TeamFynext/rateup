import Link from "next/link";

import {
  IconBrandFacebook,
  IconBrandInstagram,
  IconBrandLinkedin,
} from "@tabler/icons-react";

export const TestimonialFooter = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-background border-t border-border px-4 py-16">
      <div className="container px-4 md:px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 md:gap-12">
          <div>
            <h3 className="font-bold text-2xl pb-4 text-[#00397b]">
              Testimonique
            </h3>
            <p className="text-muted-foreground">
              The easiest way to collect, manage, and showcase customer
              testimonials on your website.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-lg pb-4 text-[#013553]">
              Product
            </h4>
            <ul className="space-y-3">
              <li>
                <Link
                  href="#features"
                  className="text-[#1c518e] transition-colors"
                >
                  Features
                </Link>
              </li>
              <li>
                <Link
                  href="/pricing"
                  className="text-[#1c518e] transition-colors"
                >
                  Pricing
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-lg pb-4 text-[#013553]">
              Company
            </h4>
            <ul className="space-y-3">
              <li>
                <Link
                  href="/about-us"
                  className="text-[#1c518e] transition-colors"
                >
                  About
                </Link>
              </li>
              <li>
                <Link
                  href="https://blog.rateup.app/"
                  className="text-[#1c518e] transition-colors"
                >
                  Blog
                </Link>
              </li>

              <li>
                <Link
                  href="/contact-us"
                  className="text-[#1c518e] transition-colors"
                >
                  Contact
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-lg pb-4 text-[#013553]">Legal</h4>
            <ul className="space-y-3">
              <li>
                <Link
                  href="/privacy-policy"
                  className="text-[#1c518e] transition-colors"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link
                  href="/terms-of-service"
                  className="text-[#1c518e] transition-colors"
                >
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-16 pt-8 border-t border-border flex flex-col md:flex-row justify-between items-center">
          <p className="text-muted-foreground text-sm">
            © {currentYear} Testimonique. All rights reserved.
          </p>
          <div className="flex space-x-6 mt-4 md:mt-0 text-[#00397b]">
            <Link href="https://www.facebook.com/people/RateUp/61556199852468/">
              <IconBrandFacebook className="h-5 w-5 hover:text-[#1c518e] transition-colors" />
            </Link>
            <Link href="https://www.instagram.com/rateupsoftware/">
              <IconBrandInstagram className="h-5 w-5 hover:text-[#1c518e] transition-colors" />
            </Link>
            <Link href="https://www.linkedin.com/company/rateup">
              <IconBrandLinkedin className="h-5 w-5 hover:text-[#1c518e] transition-colors" />
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default TestimonialFooter;
