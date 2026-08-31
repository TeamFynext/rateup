import { IconBrandFacebook, IconBrandInstagram, IconBrandLinkedin } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";

const TestimonialFooter = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-background border-t border-border px-4 py-16">
      <div className="container px-4 md:px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 md:gap-12">
          <div>
            <h3 className="font-bold text-2xl pb-4 text-[#00397b]">Testimonique</h3>
            <p className="text-muted-foreground">
              The easiest way to collect, manage, and showcase customer testimonials on your
              website.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-lg pb-4 text-[#013553]">Product</h4>
            <ul className="space-y-3">
              <li>
                <a href="#features" className="text-primary transition-colors">
                  Features
                </a>
              </li>
              <li>
                <Link to="/pricing" className="text-primary transition-colors">
                  Pricing
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-lg pb-4 text-[#013553]">Company</h4>
            <ul className="space-y-3">
              <li>
                <Link to="/about-us" className="text-primary transition-colors">
                  About
                </Link>
              </li>
              <li>
                <a href="https://blog.rateup.app/" className="text-primary transition-colors">
                  Blog
                </a>
              </li>

              <li>
                <Link to="/contact-us" className="text-primary transition-colors">
                  Contact
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-lg pb-4 text-[#013553]">Legal</h4>
            <ul className="space-y-3">
              <li>
                <Link to="/privacy-policy" className="text-primary transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/terms-of-service" className="text-primary transition-colors">
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
            <a href="https://www.facebook.com/people/RateUp/61556199852468/">
              <IconBrandFacebook className="h-5 w-5 hover:text-primary transition-colors" />
            </a>
            <a href="https://www.instagram.com/rateupsoftware/">
              <IconBrandInstagram className="h-5 w-5 hover:text-primary transition-colors" />
            </a>
            <a href="https://www.linkedin.com/company/rateup">
              <IconBrandLinkedin className="h-5 w-5 hover:text-primary transition-colors" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default TestimonialFooter;
