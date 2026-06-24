import { IconBrandFacebook, IconBrandInstagram, IconBrandLinkedin } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";

const InboxFooter = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-background border-t border-border px-4 py-16">
      <div className="container px-4 md:px-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 md:gap-12">
          <div>
            <h3 className="font-bold text-2xl pb-4 text-[#00397b]">RateUp</h3>
            <p className="text-muted-foreground">
              Stop guessing what your employees are thinking. Start listening, understanding, and
              resolving. Book a free, no-obligation demo to see RateUp in action.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-lg pb-4 text-[#013553]">Product</h4>
            <ul className="space-y-3">
              <li>
                <Link to="#features" className="text-[#1c518e] transition-colors">
                  Features
                </Link>
              </li>
              <li>
                <Link to="/pricing" className="text-[#1c518e] transition-colors">
                  Pricing
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-lg pb-4 text-[#013553]">Company</h4>
            <ul className="space-y-3">
              <li>
                <Link to="/about-us" className="text-[#1c518e] transition-colors">
                  About
                </Link>
              </li>
              <li>
                <Link to="https://blog.rateup.app/" className="text-[#1c518e] transition-colors">
                  Blog
                </Link>
              </li>

              <li>
                <Link to="/contact-us" className="text-[#1c518e] transition-colors">
                  Contact
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-lg pb-4 text-[#013553]">Legal</h4>
            <ul className="space-y-3">
              <li>
                <Link to="/privacy-policy" className="text-[#1c518e] transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/terms-of-service" className="text-[#1c518e] transition-colors">
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
            <Link
              to="https://www.instagram.com/rateupsoftware/"
              className="text-gray-800 hover:text-gray-700"
            >
              <IconBrandInstagram size={20} />
            </Link>
            <Link
              to="https://www.linkedin.com/company/rateup"
              className="text-gray-800 hover:text-gray-700"
            >
              <IconBrandLinkedin size={20} />
            </Link>
            <Link
              to="https://www.facebook.com/people/RateUp/61556199852468/"
              className="text-gray-800 hover:text-gray-700"
            >
              <IconBrandFacebook size={20} />
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default InboxFooter;
