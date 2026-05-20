import { Link } from "@tanstack/react-router";

import { imagesPath } from "@/utils/constants.ts";

type LinkItem = {
  title: string;
  href: string;
};

type Column = {
  heading: string;
  links: LinkItem[];
  showMore?: boolean;
};

export const columns: Column[] = [
  {
    heading: "Product",
    links: [
      { title: "Omnichannel Team Inbox", href: "/dashboard/inbox" },
      { title: "Smart AI Automation", href: "/dashboard/automation" },
      { title: "AI Chatbot", href: "/dashboard/chatbot" },
      { title: "AI Workflow", href: "/dashboard/workflow" },
      { title: "AI Analytics & Insights", href: "/dashboard/analytics" },
      { title: "Loyaity & Referrals", href: "/dashboard/loyalty" }, // kept original spelling
    ],
    showMore: true,
  },
  {
    heading: "Solutions",
    links: [
      { title: "Marketing & Sales", href: "/solutions/marketing-sales" },
      { title: "Customer Support", href: "/solutions/customer-support" },
      { title: "Healthcare", href: "/solutions/healthcare" },
      { title: "eLearning", href: "/solutions/elearning" },
      { title: "E-Commerce", href: "/solutions/ecommerce" },
      { title: "Finance", href: "/solutions/finance" },
      { title: "Hospitality", href: "/solutions/hospitality" },
    ],
  },
  {
    heading: "Integrations",
    links: [
      { title: "Salesforce", href: "/integrations/salesforce" },
      { title: "HubSpot", href: "/integrations/hubspot" },
      { title: "Zapier", href: "/integrations/zapier" },
      { title: "Zapier", href: "/integrations/zapier" },
      { title: "Zapier", href: "/integrations/zapier" },
      { title: "Zapier", href: "/integrations/zapier" },
    ],
    showMore: true,
  },
  {
    heading: "Comparison",
    links: [
      { title: "RateUp vs Trengo", href: "/comparison/trengo" },
      { title: "RateUp vs Gallabox", href: "/comparison/gallabox" },
      { title: "RateUp vs CleverTap", href: "/comparison/clevertap" },
      { title: "RateUp vs CleverTap", href: "/comparison/clevertap" },
      { title: "RateUp vs CleverTap", href: "/comparison/clevertap" },
    ],
    showMore: true,
  },
  {
    heading: "Company",
    links: [
      { title: "About Us", href: "/company/about" },
      { title: "Contact", href: "/company/contact" },
      { title: "Careers", href: "/company/careers" },
      { title: "Support Center", href: "/company/support" },
    ],
  },
  {
    heading: "Resources",
    links: [
      { title: "Blog", href: "/resources/blog" },
      { title: "Newsroom", href: "/resources/newsroom" },
      { title: "Case Studies", href: "/resources/case-studies" },
      { title: "Help Center", href: "/resources/help-center" },
    ],
  },
  {
    heading: "Pricing",
    links: [
      { title: "Basic Plan", href: "/pricing/basic" },
      { title: "Plus Plan", href: "/pricing/plus" },
      { title: "Custom Plan", href: "/pricing/premium" }, // mapped to closest
    ],
  },
];

const socialLinks = [
  {
    name: "YouTube",
    src: `${imagesPath}/landing/icons/ico-youtube.svg`,
    href: "https://www.youtube.com/@TeamRateup",
  },
  {
    name: "Instagram",
    src: `${imagesPath}/landing/icons/ico-instagram.svg`,
    href: "https://www.instagram.com/rateupsoftware",
  },
  {
    name: "Facebook",
    src: `${imagesPath}/landing/icons/ico-facebook.svg`,
    href: "https://www.facebook.com/rateupsapp",
  },
  {
    name: "Threads",
    src: `${imagesPath}/landing/icons/ico-threads.svg`,
    href: "https://www.threads.com/@rateupsoftware",
  },
  {
    name: "X",
    src: `${imagesPath}/landing/icons/ico-x.svg`,
    href: "https://x.com/rateup_app",
  },
  {
    name: "Pinterest",
    src: `${imagesPath}/landing/icons/ico-pintrest.svg`,
    href: "https://www.pinterest.com/rateupapp/",
  },
];

const legalLinks = [
  { title: "Privacy Policy", link: "/privacy-policy" },
  { title: "Terms of Service", link: "/terms-of-service" },
  { title: "Cookie Policy", link: "#" },
  { title: "Cancellation Policy", link: "#" },
  { title: "DPA / Security", link: "#" },
];

export function Footer() {
  return (
    <footer className="bg-[#FFFFFF] border-t border-white/10 pt-12 pb-0">
      <div className="xl:max-w-6xl xl:mx-auto xl:w-[calc(100%-4rem)] px-8 xl:px-0 py-2">
        {/* Nav columns */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-x-6 gap-y-10 mb-2">
          {columns.map((col) => (
            <div key={col.heading}>
              <p className="text-shade-of-blue-14 font-semibold text-sm mb-4">
                {col.heading}
              </p>
              <ul className="space-y-2.5">
                {col.links.map((link, i) => (
                  <li key={i}>
                    <Link
                      to={link.href}
                      className="text-grey-color-7 hover:text-rateup-blue text-[13px] leading-snug transition-colors"
                    >
                      {link.title}
                    </Link>
                  </li>
                ))}
                {col.showMore && (
                  <li>
                    <Link
                      to="#"
                      className="text-[#1a5bbf] hover:text-white text-[13px] transition-colors"
                    >
                      Show More
                    </Link>
                  </li>
                )}
              </ul>
            </div>
          ))}
        </div>

        {/* Middle row: Meta badge | App store badges | Social icons */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-8 py-8 border-t border-white/10">
          {/* Meta Business Partner badge with glow */}
          <div className="relative">
            <div
              className="absolute inset-0 rounded-2xl"
              style={{
                background:
                  "radial-gradient(ellipse at center, rgba(45,116,224,0.4) 0%, transparent 70%)",
                filter: "blur(20px)",
                transform: "scale(1.4)",
              }}
            />
            <img
              src={`${imagesPath}/landing/customerLogos/metaveve.png`}
              alt="Meta Business Partner"
              className="relative h-22 w-auto object-contain"
              width="200"
              height="88"
            />
          </div>
          {/* App Store badges */}
          <div className="flex items-center gap-4">
            {/* Google Play */}
            <a
              href="https://play.google.com/store/apps/details?id=com.rateupapp.rateup&pcampaignid=web_share"
              className="flex items-center gap-3 bg-white border border-black/10 rounded-xl px-4 py-2.5 hover:border-black/20 transition-colors"
            >
              <img
                src={`${imagesPath}/landing/logos/ico-playstore.png`}
                alt="Google Play"
                className="w-6 h-6 object-contain"
              />
              <div>
                <div className="text-[10px] text-grey-color-7 leading-none mb-0.5">
                  GET IT ON
                </div>
                <div className="text-black font-semibold text-[14px] leading-tight">
                  Google Play
                </div>
              </div>
            </a>

            {/* App Store */}
            <a
              href="https://apps.apple.com/us/app/rateup/id6761990608"
              className="flex items-center gap-3 bg-white border border-black/10 rounded-xl px-4 py-2.5 hover:border-black/20 transition-colors"
            >
              <img
                src={`${imagesPath}/landing/logos/ico-appstore.png`}
                alt="App Store"
                className="w-6 h-6 object-contain"
              />
              <div>
                <div className="text-grey-color-7 text-[10px] text-black/50 leading-none mb-0.5">
                  Download on the
                </div>
                <div className="text-black font-semibold text-[14px] leading-tight">
                  App Store
                </div>
              </div>
            </a>
          </div>
          {/* Social icons */}

          <div className="flex flex-col items-end gap-3">
            <span className="text-[#1a5bbf] text-sm font-medium pr-4">
              Follow us on
            </span>
            <div className="flex items-center gap-2">
              {socialLinks.map(({ name, src, href }, i) => (
                <a
                  key={i}
                  href={href}
                  className="w-9 h-9 rounded-full flex items-center justify-center hover:opacity-80 transition-opacity"
                >
                  <img
                    src={src}
                    alt={name}
                    className="w-6 h-6 object-contain"
                    width="24"
                    height="24"
                  />
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
      {/* Bottom bar */}
      <div className="bg-rateup-dark-blue-3 w-full flex flex-col md:flex-row items-center justify-between gap-4 py-5 border-t border-white/10 lg:px-14">
        <p className="text-[#93C6F5]/70 text-sm">
          ©2025 RateUp. All rights reserved.
        </p>
        <nav className="flex flex-wrap justify-center gap-x-6 gap-y-1">
          {legalLinks.map((l) => (
            <Link
              key={l.title}
              to={l.link}
              className="text-[#93C6F5]/70 hover:text-white text-sm transition-colors"
            >
              {l.title}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
