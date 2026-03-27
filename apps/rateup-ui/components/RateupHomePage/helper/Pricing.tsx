import { ChevronRight } from "lucide-react";

const CheckIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 20 20"
    fill="none"
    className="shrink-0 mt-0.5"
  >
    <circle cx="10" cy="10" r="10" fill="#004F98" fillOpacity="0.3" />
    <circle cx="10" cy="10" r="7" fill="#2D74E0" fillOpacity="0.15" />
    <path
      d="M6.5 10L8.8 12.5L13.5 7.5"
      stroke="#66D7FF"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

interface Plan {
  badge: string;
  price: string;
  priceSuffix?: string;
  features: string[];
  cta: string;
  isPopular?: boolean;
  ctaVariant?: "primary" | "outline";
}

const plans: Plan[] = [
  {
    badge: "BASIC",
    price: "$49",
    priceSuffix: "/mo",
    features: [
      "Unified Inbox (WA + IG + FB + Web)",
      "Up To 500 Customer Profiles/Mo",
      "Post-Purchase Feedback Flow",
      "Basic Loyalty Rewards",
      "Mobile App Access",
      "Website Widget",
      "2 Agent Logins",
      "AI Chatbot",
      "Automation Builder",
      "CX Intelligence",
    ],
    cta: "Get Started Free",
    ctaVariant: "primary",
  },
  {
    badge: "MOST POPULAR",
    price: "$149",
    priceSuffix: "/mo",
    features: [
      "Everything In Basic",
      "Up To 2,500 Profiles/Mo",
      "WhatsApp AI Chatbot (Multi-Language)",
      "No-Code Automation Builder",
      "Instagram & WhatsApp Automations",
      "Campaign Manager (Bulk + Personalized)",
      "CX Intelligence + AI Sentiment",
      "Ticketing & Escalation Engine",
      "QR Studio",
      "10 Agent Logins",
    ],
    cta: "Get Started Free",
    isPopular: true,
    ctaVariant: "primary",
  },
  {
    badge: "PREMIUM",
    price: "Custom",
    features: [
      "Everything In Plus",
      "Unlimited Profiles & Agents",
      "Multi-Branch Management",
      "Shopify + WooCommerce + Custom API",
      "Salesforce & HubSpot Integration",
      "GDPR Compliance Toolkit",
      "Dedicated Success Manager",
      "SLA & Uptime Guarantee",
      "White-Label Option",
    ],
    cta: "Contact Sales",
    ctaVariant: "outline",
  },
];

export function Pricing() {
  return (
    <section
      className=" bg-rateup-dark-blue-3 relative overflow-hidden"
      id="pricing"
    >
      {/* Glow behind middle card */}
      <div className="pointer-events-none absolute left-1/2 top-[55%] -translate-x-1/2 -translate-y-1/2 w-[360px] h-[700px] rounded-full bg-[#004F98] opacity-25 blur-[100px] z-0" />

      <div className="xl:max-w-6xl xl:mx-auto xl:w-[calc(100%-4rem)] px-8 xl:px-0 relative z-10">
        {/* Heading */}
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-[44px] font-bold text-white tracking-tight mb-3">
            Pricing Comparison
          </h2>
          <p className="text-[#C4D7F5] text-base md:text-[17px]">
            Get more value with RateUp's transparent and competitive pricing
          </p>
        </div>

        {/* Cards grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
          {plans.map((plan) => (
            <div
              key={plan.badge}
              className={`relative flex flex-col rounded-[24px] overflow-hidden
                ${
                  plan.isPopular
                    ? "bg-[#000A1F] border border-[#2D74E0] shadow-[0_0_0_1px_#2D74E0,0_0_80px_-10px_#004F98]"
                    : "bg-[#000A1F]/80 border border-[#2D74E0]/20"
                }`}
            >
              {/* Badge */}
              <div className="pt-8 px-8 pb-0 flex justify-center">
                <span
                  className={`text-[11px] font-bold tracking-[0.12em] uppercase px-4 py-1.5 rounded-full border
                    ${
                      plan.isPopular
                        ? "bg-[#2D74E0] text-white border-[#2D74E0]"
                        : "bg-transparent text-[#93C6F5] border-[#2D74E0]/40"
                    }`}
                >
                  {plan.badge}
                </span>
              </div>

              {/* Price */}
              <div className="px-8 pt-5 pb-6">
                {plan.priceSuffix ? (
                  <div className="flex items-baseline gap-1">
                    <span className="text-5xl md:text-6xl font-bold text-white">
                      {plan.price}
                    </span>
                    <span className="text-[#93C6F5] text-base font-medium">
                      {plan.priceSuffix}
                    </span>
                  </div>
                ) : (
                  <div className="text-5xl md:text-6xl font-bold text-white">
                    {plan.price}
                  </div>
                )}
              </div>

              {/* Divider */}
              <div className="mx-8 h-px bg-[#2D74E0]/20 mb-6" />

              {/* Features */}
              <ul className="px-8 flex-1 space-y-3.5 mb-8">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-3">
                    <CheckIcon />
                    <span className="text-[#E2E5ED] text-sm leading-snug">
                      {f}
                    </span>
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <div className="px-8 pb-8 mt-auto">
                {plan.ctaVariant === "primary" ? (
                  <button className="w-full flex items-center justify-center gap-2 bg-[#2D74E0] hover:bg-[#0045CC] text-white font-medium text-sm rounded-xl py-3.5 transition-colors group">
                    {plan.cta}
                    <div className="bg-[#001747] rounded-md w-6 h-6 flex items-center justify-center group-hover:bg-[#001747]/80 transition-colors">
                      <ChevronRight className="w-3.5 h-3.5 text-white" />
                    </div>
                  </button>
                ) : (
                  <button className="w-full flex items-center justify-center gap-2 bg-transparent hover:bg-white/5 text-white font-medium text-sm rounded-xl py-3.5 border border-white/25 transition-colors group">
                    {plan.cta}
                    <ChevronRight className="w-4 h-4 text-white" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
