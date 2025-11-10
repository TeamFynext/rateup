import Image from "next/image";
import Link from "next/link";

import {
  IconBrandFacebook,
  IconBrandFacebookFilled,
  IconBrandInstagram,
  IconBrandInstagramFilled,
  IconBrandX,
  IconBrandYoutube,
} from "@tabler/icons-react";
import { InstagramIcon } from "next-share";

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
    <section className="bg-white py-12 flex justify-center">
      <div className="max-w-7xl flex items-start justify-between w-full">
        <div className="flex items-start gap-20 w-full">
          {/* Products */}
          <div className="flex flex-col justify-between h-full">
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
          <div className="flex flex-col justify-between h-full">
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
          <div className="flex flex-col justify-between h-full">
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
          <div className="flex flex-col justify-between h-full">
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

        <div className="flex flex-col items-center justify-between min-w-[20vw] gap-20">
          <div className="flex flex-col items-center justify-center gap-4">
            <div className="border border-[#E2E5ED] rounded-xl px-4 py-2 flex w-[10vw] items-center justify-between">
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
                <span className="text-xs text-[#7A8289]">Get it on</span>
                <span className="text-sm font-semibold">Google Play</span>
              </div>
            </div>
            <div className="border border-[#E2E5ED] rounded-xl px-4 py-2 flex w-[10vw] items-center justify-between">
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
                <span className="text-xs text-[#7A8289]">Download on the</span>
                <span className="text-sm font-semibold">App Store</span>
              </div>
            </div>
          </div>

          <div>
            <span>Follow Us</span>
            <div className="flex items-center gap-4 justify-center">
              <Link href={"#"}>
                <IconBrandInstagram width={40} height={40} color="#D62976" />
              </Link>
              <Link href={"#"}>
                <IconBrandFacebook width={40} height={40} color="#1877F2" />
              </Link>
              <Link href={"#"}>
                <IconBrandX width={40} height={40} color="#000000" />
              </Link>
              <Link href={"#"}>
                <IconBrandYoutube width={40} height={40} color="#FF0000" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
