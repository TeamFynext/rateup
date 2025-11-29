import Image from "next/image";
import Link from "next/link";

import {
  IconBrandFacebook,
  IconBrandInstagram,
  IconBrandPinterest,
  IconBrandThreads,
  IconBrandX,
  IconBrandYoutube,
} from "@tabler/icons-react";

import { imagePath } from "@/components/HomePage/pages/constants";

const products = [
  { title: "Omnichannel Team Inbox", href: "/dashboard/inbox" },
  { title: "Smart AI Automation", href: "/dashboard/automation" },
  { title: "AI Chatbot", href: "/dashboard/chatbot" },
  { title: "AI Workflow", href: "/dashboard/workflow" },
  { title: "AI Analytics & Insights", href: "/dashboard/analytics" },
  { title: "Loyalty & Referrals", href: "/dashboard/loyalty" },
  { title: "Feedback Collection", href: "/dashboard/feedback" },
  { title: "WhatsApp Flow", href: "/dashboard/whatsapp-flow" },
  { title: "WhatsApp Campaigns", href: "/dashboard/whatsapp-campaigns" },
  { title: "Ticketing & Escalation", href: "/dashboard/ticketing" },
  { title: "Multi - Branch", href: "/dashboard/multi-branch" },
  { title: "QR Studio", href: "/dashboard/qr-studio" },
  { title: "APIs/Integrations", href: "/dashboard/apis" },
];

const solutions = [
  { title: "Marketing & Sales", href: "/solutions/marketing-sales" },
  { title: "Customer Support", href: "/solutions/customer-support" },
  { title: "Healthcare", href: "/solutions/healthcare" },
  { title: "eLearning", href: "/solutions/elearning" },
  { title: "E-Commerce", href: "/solutions/ecommerce" },
  { title: "Finance", href: "/solutions/finance" },
  { title: "Hospitality", href: "/solutions/hospitality" },
];

const resources = [
  { title: "Blog", href: "/resources/blog" },
  { title: "Newsroom", href: "/resources/newsroom" },
  { title: "Case Studies", href: "/resources/case-studies" },
  { title: "Help Center", href: "/resources/help-center" },
];

const comparison = [
  { title: "RateUp vs Trengo", href: "/comparison/trengo" },
  { title: "RateUp vs Gallabox", href: "/comparison/gallabox" },
  { title: "RateUp vs CleverTap", href: "/comparison/clevertap" },
  { title: "RateUp vs Zoho SalesIQ", href: "/comparison/zoho-salesiq" },
  { title: "RateUp vs Hubspot", href: "/comparison/hubspot" },
  { title: "RateUp vs Twilio Engage", href: "/comparison/twilio" },
];

const company = [
  { title: "About Us", href: "/company/about" },
  { title: "Contact", href: "/company/contact" },
  { title: "Careers", href: "/company/careers" },
  { title: "Support Center", href: "/company/support" },
];

const pricing = [
  { title: "Basic Plan", href: "/pricing/basic" },
  { title: "Plus Plan", href: "/pricing/plus" },
  { title: "Premium Plan", href: "/pricing/premium" },
];

const integrations = [
  { title: "Salesforce", href: "/integrations/salesforce" },
  { title: "HubSpot", href: "/integrations/hubspot" },
  { title: "Zapier", href: "/integrations/zapier" },
  { title: "Show More", href: "/integrations" },
];

export default function HomePageFooter() {
  return (
    <section className="bg-white flex justify-center flex-col">
      <div className="flex justify-center py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl flex flex-col lg:flex-row items-start justify-between w-full gap-8 lg:gap-10">
          <div className="flex flex-col sm:flex-row sm:flex-wrap lg:flex-nowrap items-start gap-8 sm:gap-10 lg:gap-30 w-full lg:w-auto">
            {/* Products */}
            <div className="flex flex-col justify-between h-full w-full sm:w-auto">
              <div className="flex flex-col text-xs text-gray-700 gap-3">
                <h4 className="text-xs font-semibold text-rateup-blue">
                  Product
                </h4>
                {products.map((pdct) => (
                  <Link
                    key={pdct.title}
                    href={pdct.href}
                    className="hover:underline"
                  >
                    {pdct.title}
                  </Link>
                ))}
              </div>
            </div>

            {/* Solutions + Company */}
            <div className="flex flex-col justify-between h-full gap-10 w-full sm:w-auto">
              <div className="flex flex-col text-xs text-gray-700 gap-3">
                <h4 className="text-xs font-semibold text-rateup-blue">
                  Solutions
                </h4>
                {solutions.map((s) => (
                  <Link key={s.title} href={s.href} className="hover:underline">
                    {s.title}
                  </Link>
                ))}
              </div>

              <div className="flex flex-col text-xs text-gray-700 gap-3">
                <h4 className="text-xs font-semibold text-rateup-blue">
                  Company
                </h4>
                {company.map((c) => (
                  <Link key={c.title} href={c.href} className="hover:underline">
                    {c.title}
                  </Link>
                ))}
              </div>
            </div>

            {/* Resources + Pricing */}
            <div className="flex flex-col justify-between h-full gap-10 lg:gap-35 w-full sm:w-auto">
              <div className="flex flex-col text-xs text-gray-700 gap-3">
                <h4 className="text-xs font-semibold text-rateup-blue">
                  Resources
                </h4>
                {resources.map((r) => (
                  <Link key={r.title} href={r.href} className="hover:underline">
                    {r.title}
                  </Link>
                ))}
              </div>

              <div className="flex flex-col text-xs text-gray-700 gap-3">
                <h4 className="text-xs font-semibold text-rateup-blue">
                  Pricing
                </h4>
                {pricing.map((p) => (
                  <Link key={p.title} href={p.href} className="hover:underline">
                    {p.title}
                  </Link>
                ))}
              </div>
            </div>

            {/* Comparison + Integrations */}
            <div className="flex flex-col justify-between h-full gap-10 lg:gap-17 w-full sm:w-auto">
              <div className="flex flex-col text-xs text-gray-700 gap-3">
                <h4 className="text-xs font-semibold text-rateup-blue">
                  Comparison
                </h4>
                {comparison.map((c) => (
                  <Link key={c.title} href={c.href} className="hover:underline">
                    {c.title}
                  </Link>
                ))}
              </div>

              <div className="flex flex-col text-xs text-gray-700 gap-3">
                <h4 className="text-xs font-semibold text-rateup-blue">
                  Integrations
                </h4>
                {integrations.map((i) => (
                  <Link key={i.title} href={i.href} className="hover:underline">
                    {i.title}
                  </Link>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center justify-center lg:min-w-[15vw] gap-8 lg:gap-20 mt-8 lg:mt-0">
            <div className="bg-[linear-gradient(135deg,#FFF5F5,#F5EBFF,#E0EEFF,#F5FFFB)] flex flex-col items-center justify-center gap-1 py-1 px-3 rounded-xl">
              <div className="flex items-center justify-center gap-2">
                <Image
                  src={`${imagePath}/homepage/meta.svg`}
                  alt="meta"
                  width={50}
                  height={50}
                />
                <span className="font-bold text-xl">Meta</span>
              </div>
              <div className="flex flex-col items-start justify-center">
                <span className="text-sm text-grey-color-6">
                  Business Partner
                </span>
              </div>
            </div>
            <div className="w-full">
              <div className="text-left mb-2">Follow us</div>
              <div className="flex items-center gap-4 justify-center flex-wrap">
                <Link
                  href={"https://www.instagram.com/rateupsoftware"}
                  target="_blank"
                >
                  <IconBrandInstagram width={30} height={30} color="#D62976" />
                </Link>
                <Link
                  href={"https://www.facebook.com/rateupsapp"}
                  target="_blank"
                >
                  <IconBrandFacebook width={30} height={30} color="#1877F2" />
                </Link>
                <Link href={"https://x.com/rateup_app"} target="_blank">
                  <IconBrandX width={30} height={30} color="#000000" />
                </Link>
                <Link
                  href={"https://www.pinterest.com/rateupapp/"}
                  target="_blank"
                >
                  <IconBrandPinterest width={30} height={30} color="#FF0000" />
                </Link>
                <Link
                  href={"https://www.threads.com/@rateupsoftware"}
                  target="_blank"
                >
                  <IconBrandThreads width={30} height={30} color="#000000" />
                </Link>
                <Link
                  href={"https://www.youtube.com/@TeamRateup"}
                  target="_blank"
                >
                  <IconBrandYoutube width={30} height={30} color="#FF0000" />
                </Link>
              </div>
            </div>

            <div className="flex flex-col items-center justify-center gap-4 w-full">
              <Link
                href={
                  "https://play.google.com/store/apps/details?id=com.rateupapp.rateup&pcampaignid=web_share"
                }
                target="_blank"
                className="border border-light-blue-5 rounded-xl px-4 py-2 flex w-[60vw] sm:w-[300px] lg:w-[12vw] items-center justify-between cursor-pointer"
              >
                <div>
                  <Image
                    src={`${imagePath}/homepage/googleplay.svg`}
                    alt="googleplay"
                    width={40}
                    height={40}
                    className="w-full h-auto"
                  />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-grey-color-6">Get it on</span>
                  <span className="text-sm font-semibold">Google Play</span>
                </div>
              </Link>
              <div className="border border-light-blue-5 rounded-xl px-4 py-2 flex w-[60vw] sm:w-[300px] lg:w-[12vw] items-center justify-between cursor-pointer">
                <div>
                  <Image
                    src={`${imagePath}/homepage/apple.svg`}
                    alt="apple"
                    width={40}
                    height={40}
                    className="w-full h-auto"
                  />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-grey-color-6">
                    Download on the
                  </span>
                  <span className="text-sm font-semibold">App Store</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="bg-rateup-darkblue flex flex-col sm:flex-row items-center justify-between px-4 sm:px-8 lg:px-40 py-4 gap-4">
        <span className="bg-gradient-to-r from-rateup-blue-3 to-rateup-blue-2 bg-clip-text text-transparent text-xs text-center sm:text-left">
          ©2025 RateUp. All rights reserved.
        </span>
        <span className="w-full sm:w-auto">
          <ul className="flex items-center justify-center flex-wrap gap-2 sm:gap-4 text-light-blue-5 text-xs">
            <li>
              <Link href={"/privacy-policy"}>Privacy Policy</Link>
            </li>
            <li>
              <Link href={"/terms-of-service"}>Terms of Service</Link>
            </li>
            <li>
              <Link href={"#"}>Cookie Policy</Link>
            </li>
            <li>
              <Link href={"#"}>Cancellation Policy</Link>
            </li>
            <li>
              <Link href={"#"}>DPA / Security</Link>
            </li>
          </ul>
        </span>
      </div>
    </section>
  );
}
