import { IconBrandFacebook, IconBrandInstagram, IconBrandLinkedin } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";

const AutomationFooter = () => {
  return (
    <footer className="bg-gray-900 text-white pt-12 pb-8">
      <div className="max-w-7xl mx-auto px-6 lg:px-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
          <div>
            <h3 className="font-bold text-xl mb-4">RateUp</h3>
            <p className="text-gray-400 mb-4">
              Experience the power of AI-enabled automation. Get started with RateUp today and build
              smarter, more efficient customer journeys.
            </p>
            <div className="flex space-x-4 mt-3">
              <a
                href="https://www.instagram.com/rateupsoftware/"
                className="text-gray-400 hover:text-white"
              >
                <IconBrandInstagram size={20} />
              </a>
              <a
                href="https://www.linkedin.com/company/rateup"
                className="text-gray-400 hover:text-white"
              >
                <IconBrandLinkedin size={20} />
              </a>
              <a
                href="https://www.facebook.com/people/RateUp/61556199852468/"
                className="text-gray-400 hover:text-white"
              >
                <IconBrandFacebook size={20} />
              </a>
            </div>
          </div>

          <div>
            <h4 className="font-bold mb-4">Company</h4>
            <ul className="space-y-2">
              <li>
                <a href="#" className="hover:text-gray-300 transition">
                  Resources
                </a>
              </li>
              <li>
                <Link to="/about-us" className="hover:text-gray-300 transition">
                  About Us
                </Link>
              </li>
              <li>
                <Link to="/contact-us" className="hover:text-gray-300 transition">
                  Contact Us
                </Link>
              </li>
              <li>
                <Link to="/blog" className="hover:text-gray-300 transition">
                  Blog
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-lg font-semibold mb-3">Pricing</h4>
            <ul className="space-y-2 text-sm text-gray-100">
              <li>
                <Link to="/pricing" className="hover:text-gray-300 transition">
                  Basic Plan
                </Link>
              </li>
              <li>
                <Link to="/pricing" className="hover:text-gray-300 transition">
                  Plus Plan
                </Link>
              </li>
              <li>
                <Link to="/pricing" className="hover:text-gray-300 transition">
                  Premium Plan
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold mb-4">Legal</h4>

            <ul className="space-y-2 text-sm text-gray-100">
              <li>
                <Link to="/privacy-policy" className="hover:text-gray-300 transition">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/terms-of-service" className="hover:text-gray-300 transition">
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 pt-8 mt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-gray-400 text-sm mb-4 md:mb-0">
            &copy; {new Date().getFullYear()} RateUp. All rights reserved.
          </p>
          <div className="flex space-x-6">
            <Link to="/privacy-policy" className="text-gray-400 hover:text-white text-sm">
              Privacy Policy
            </Link>
            <a href="#" className="text-gray-400 hover:text-white text-sm">
              Terms of Service
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default AutomationFooter;
